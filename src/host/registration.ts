/**
 * Registration reconciliation between the `mcp.json` files and the official
 * `ctx.mcpManager`.
 *
 * Every effective file server becomes one manager registration owned by this
 * plugin: registering contributes the server for this plugin's lifetime, and
 * the returned disposer removes it (the manager then awaits the instance's
 * cleanup and withdraws its tools). A registration must be replaced rather
 * than updated because the manager rejects a duplicate name, so this fleet
 * disposes the previous registration before mounting the next one and skips
 * the churn when the entry is unchanged.
 *
 * The module is Host-only but free of Cordis and filesystem access: it takes
 * the manager face, the ambient environment, and the merged file servers.
 */

import type { McpServerRegistration } from '@deepseek-ai/dsh-mcp-manager'
import { validateMcpConfig, toRegistration } from './mcp-config.ts'
import { expandServer } from './mcp-sources.ts'
import { validateServerConfig } from '../server-config.ts'
import type { RegistrationView, StoredServer } from '../types.ts'

/** The manager surface this module needs, structurally typed for tests. */
export interface RegistrationManager {
  list(): readonly { readonly name: string; readonly configured: boolean }[]
  register(name: string, entry: McpServerRegistration): () => void
}

/** One reconciled server: what was registered, and why it was not. */
export interface ReconciledServer {
  readonly id: string
  readonly outcome: RegistrationView
}

/** Names that may not be registered because another file server already claimed them. */
type Conflicts = ReadonlyMap<string, string>

/**
 * Keep the manager's registered set equal to the file servers.
 *
 * `reconcile` is idempotent: unchanged entries keep their live registration,
 * removed entries are disposed, and a failed entry is retried on the next
 * pass (so deleting the colliding configuration entry recovers on refresh).
 */
export class RegistrationFleet {
  private readonly live = new Map<string, { readonly dispose: () => void; readonly fingerprint: string }>()
  private readonly outcomes = new Map<string, RegistrationView>()
  private disposed = false

  /**
   * @param manager - the official MCP manager face.
   * @param env - ambient environment used for `${env:…}` expansion.
   */
  constructor(
    private readonly manager: RegistrationManager,
    private readonly env: () => Readonly<Record<string, string | undefined>>,
  ) {}

  /**
   * Reconcile one full pass over the effective file servers.
   * @param servers - the winning definitions, in panel order.
   * @returns one outcome per server, in the same order.
   */
  reconcile(servers: readonly StoredServer[]): readonly ReconciledServer[] {
    if (this.disposed) return servers.map(server => ({ id: server.id, outcome: { state: 'error', error: 'the plugin is disposed' } }))
    const wanted = new Set(servers.map(server => server.id))
    for (const [name, entry] of [...this.live]) {
      if (wanted.has(name)) continue
      this.drop(name, entry)
    }

    const conflicts = this.credentialConflicts(servers)
    const results: ReconciledServer[] = []
    for (const server of servers) {
      const outcome = this.apply(server, conflicts)
      this.outcomes.set(server.id, outcome)
      results.push({ id: server.id, outcome })
    }
    for (const name of [...this.outcomes.keys()]) if (!wanted.has(name)) this.outcomes.delete(name)
    return results
  }

  /** The outcome of the last reconcile for one server. */
  outcome(id: string): RegistrationView {
    return this.outcomes.get(id) ?? { state: 'error', error: 'server has not been reconciled yet' }
  }

  /** Dispose every registration this fleet owns. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const [name, entry] of [...this.live]) this.drop(name, entry)
    this.outcomes.clear()
  }

  private apply(server: StoredServer, conflicts: Conflicts): RegistrationView {
    if (!server.enabled) {
      this.dropIfLive(server.id)
      return { state: 'disabled' }
    }
    const expanded = expandServer(server, this.env())
    if (expanded.missing.length > 0) {
      this.dropIfLive(server.id)
      return { state: 'missing-env', missing: [...expanded.missing] }
    }
    const conflict = conflicts.get(server.id)
    if (conflict !== undefined) {
      this.dropIfLive(server.id)
      return { state: 'invalid', error: conflict }
    }
    try {
      validateServerConfig(expanded.server)
      validateMcpConfig(expanded.server)
    } catch (error) {
      this.dropIfLive(server.id)
      return { state: 'invalid', error: messageOf(error) }
    }

    const entry = toRegistration(expanded.server)
    const fingerprint = stableStringify(entry)
    const existing = this.live.get(server.id)
    if (existing !== undefined && existing.fingerprint === fingerprint) return { state: 'registered' }
    this.dropIfLive(server.id)
    try {
      const dispose = this.manager.register(server.id, entry)
      this.live.set(server.id, { dispose, fingerprint })
      return { state: 'registered' }
    } catch (error) {
      const message = messageOf(error)
      return { state: classify(message), error: message }
    }
  }

  private credentialConflicts(servers: readonly StoredServer[]): Conflicts {
    const byKey = new Map<string, string[]>()
    for (const server of servers) {
      if (server.oauth === undefined) continue
      const owners = byKey.get(server.oauth.credentialKey) ?? []
      owners.push(server.id)
      byKey.set(server.oauth.credentialKey, owners)
    }
    const conflicts = new Map<string, string>()
    for (const [key, owners] of byKey) {
      if (owners.length < 2) continue
      for (const owner of owners) {
        const others = owners.filter(name => name !== owner).map(name => JSON.stringify(name)).join(', ')
        conflicts.set(owner, `OAuth credential ${JSON.stringify(key)} is already used by ${others}`)
      }
    }
    return conflicts
  }

  private dropIfLive(id: string): void {
    const entry = this.live.get(id)
    if (entry !== undefined) this.drop(id, entry)
  }

  private drop(id: string, entry: { readonly dispose: () => void }): void {
    this.live.delete(id)
    try {
      entry.dispose()
    } catch {
      // The manager already unloaded the instance; a throwing disposer must
      // not stop the rest of the reconcile.
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function classify(message: string): RegistrationView['state'] {
  if (/already configured or registered/u.test(message)) return 'conflict'
  if (/manager is disposed|not (?:active|loaded)|disposed/u.test(message)) return 'error'
  return 'invalid'
}

/** JSON with sorted object keys, so an unchanged entry keeps its registration. */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map(key => [key, sortValue((value as Record<string, unknown>)[key])]))
}
