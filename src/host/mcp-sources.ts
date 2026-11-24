/**
 * Merge the `mcp.json` sources into one effective server set.
 *
 * Precedence, highest first:
 *
 * | Scope | Path | Notes |
 * |---|---|---|
 * | project | `<project>/.dsh/mcp.json` | selected in the panel, validated against the workspace registry |
 * | project (compat) | `<project>/.mcp.json` | Claude Code's file, read-only |
 * | profile | `~/.dsh/profiles/<profile>/mcp.json` | the default target for a new server |
 * | user | `~/.dsh/mcp.json` | honours `$DSH_HOME` |
 *
 * A server name defined in more than one scope keeps the highest-precedence
 * definition and reports the rest as shadowed, so the panel can show them
 * instead of silently dropping user configuration.
 *
 * This module is pure: it takes filesystem read outcomes and returns the merged
 * model. The official `mcp-manager` configuration entries are a separate
 * source the browser reads through the shared settings form; they never pass
 * through this file.
 */

import { expandMap, expandTemplate } from './interpolate.ts'
import { normalizeServer } from './mcp-json.ts'
import type { ReadResult } from './mcp-file.ts'
import type { McpScope, StoredServer } from '../types.ts'

/** One scope row as the panel renders it. */
export interface SourceRow {
  readonly scope: McpScope
  readonly path: string
  readonly writable: boolean
  readonly compat: boolean
  readonly exists: boolean
  readonly serverCount: number
  readonly error?: string
  /** Per-entry failures inside an otherwise readable file. */
  readonly problems?: readonly { readonly id: string; readonly error: string }[]
}

/** One effective server plus the scopes that lost to it. */
export interface SourcedServer {
  readonly id: string
  readonly scope: McpScope
  readonly path: string
  /** Whether the winning definition lives in a writable file. */
  readonly writable: boolean
  /** Whether the winning definition is another client's read-only file. */
  readonly compat: boolean
  readonly server: StoredServer
  readonly shadowed: readonly { readonly scope: McpScope; readonly path: string }[]
}

/** The merged view of every source. */
export interface MergedSources {
  readonly servers: readonly SourcedServer[]
  readonly sources: readonly SourceRow[]
  /** Per-entry failures from every file, including shadowed scopes. */
  readonly problems: readonly { readonly scope: McpScope; readonly path: string; readonly id: string; readonly error: string }[]
}

/** Inputs for {@link mergeSources}. */
export interface MergeInput {
  /** Read outcomes in precedence order, as `readScopeFiles` returns them. */
  readonly scopes: readonly ReadResult[]
}

/**
 * Merge every source into the effective server set.
 * @param input - read outcomes.
 * @returns the effective servers and one row per source.
 */
export function mergeSources(input: MergeInput): MergedSources {
  const winners = new Map<string, SourcedServer>()
  const order: string[] = []
  const rows: SourceRow[] = []
  const problems: { scope: McpScope; path: string; id: string; error: string }[] = []

  for (const read of input.scopes) {
    const entries = read.document?.servers ?? {}
    const names = Object.keys(entries)
    const rowProblems: { id: string; error: string }[] = []
    let accepted = 0

    for (const id of names) {
      const normalized = normalizeServer(id, entries[id])
      if (!normalized.ok) {
        rowProblems.push({ id, error: normalized.error })
        problems.push({ scope: read.scope, path: read.path, id, error: normalized.error })
        continue
      }
      accepted += 1
      const existing = winners.get(id)
      if (existing === undefined) {
        order.push(id)
        winners.set(id, { id, scope: read.scope, path: read.path, writable: read.writable, compat: read.compat, server: normalized.server, shadowed: [] })
      } else {
        winners.set(id, { ...existing, shadowed: [...existing.shadowed, { scope: read.scope, path: read.path }] })
      }
    }

    rows.push({
      scope: read.scope,
      path: read.path,
      writable: read.writable,
      compat: read.compat,
      exists: read.exists,
      serverCount: accepted,
      ...read.error === undefined ? {} : { error: read.error },
      ...rowProblems.length === 0 ? {} : { problems: rowProblems },
    })
  }

  return { servers: order.map(id => winners.get(id) as SourcedServer), sources: rows, problems }
}

/** Outcome of projecting one server into an mcp-client-ready definition. */
export interface ExpandedServer {
  readonly server: StoredServer
  /** Referenced environment variables with no value and no fallback. */
  readonly missing: readonly string[]
}

/**
 * Resolve `${env:…}` templates in every text field a server carries.
 *
 * Expansion happens only here — on the way into
 * `ctx.mcpManager.register()` — so a template never reaches the panel and is
 * never written back expanded. `${credential:…}` tokens are deliberately left
 * untouched: the official MCP client resolves them through the credentials
 * service and redacts the resolved values from diagnostics.
 * @param server - the stored server, templates intact.
 * @param env - ambient environment.
 * @returns the expanded server and the unresolved variable names.
 */
export function expandServer(server: StoredServer, env: Readonly<Record<string, string | undefined>>): ExpandedServer {
  const missing: string[] = []
  const record = (names: readonly string[]): void => {
    for (const name of names) if (!missing.includes(name)) missing.push(name)
  }
  const envMap = expandMap(server.env, env)
  record(envMap.missing)
  const headerMap = expandMap(server.headers, env)
  record(headerMap.missing)

  const command = expandTemplate(server.command, env)
  record(command.missing)
  const cwd = expandTemplate(server.cwd, env)
  record(cwd.missing)
  const url = expandTemplate(server.url, env)
  record(url.missing)
  const args = server.args.map((arg) => {
    const expanded = expandTemplate(arg, env)
    record(expanded.missing)
    return expanded.value
  })

  return {
    server: {
      ...server,
      command: command.value,
      cwd: cwd.value,
      url: url.value,
      args,
      env: envMap.values,
      headers: headerMap.values,
    },
    missing,
  }
}
