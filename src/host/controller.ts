/**
 * Host-side orchestration for the MCP panel.
 *
 * This controller owns exactly what the official MCP system does not:
 *
 * - the multi-scope `mcp.json` files: reading, watching, and writing them, and
 *   turning their effective servers into `ctx.mcpManager.register()` entries;
 * - the Host-only OAuth operations (`startAuthorization`,
 *   `cancelAuthorization`, `signOut`) behind the panel's authenticated RPC;
 * - the per-tool disable policy, applied through a tool guard plus per-agent
 *   restrictions so a disabled tool is neither executed nor listed.
 *
 * Everything else is delegated: live status, restart, and probe come from the
 * official Remote surface in the browser, and the official `mcp-manager`
 * configuration entries are edited through the shared settings form. No second
 * MCP client fleet is mounted here.
 */

import { dirname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent'
import type McpServerManager from '@deepseek-ai/dsh-mcp-manager'
import type { McpOAuthAttemptId, McpOAuthAttemptView } from '@deepseek-ai/dsh-mcp-client/types'
import type { SettingsForms } from '@deepseek-ai/dsh-settings'
import type { ToolRuntime } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import {
  applyServerPatch, parseAuthorizeRequest, parseCancelAuthorizationRequest, parseRemoveRequest, parseSetEnabledRequest,
  parseSignOutRequest, parseSnapshotRequest, parseUpsertRequest, serverFromPatch, toServerView, toWorkspaceViews,
} from '../protocol.ts'
import { validateDisabledTools, type ManagerSettings } from '../settings.ts'
import type {
  AuthorizationResult, ManagedToolView, McpScope, RpcError, RpcResult, Snapshot, SnapshotRequest, StoredServer,
  UpsertServerRequest, WorkspaceView,
} from '../types.ts'
import { normalizeServer, withServer } from './mcp-json.ts'
import { mutateScopeFile, readScopeFiles, resolveScopeFiles, watchScopeFiles, type ScopeFile } from './mcp-file.ts'
import { mergeSources, type MergedSources, type SourcedServer } from './mcp-sources.ts'
import { RegistrationFleet, type RegistrationManager } from './registration.ts'
import { registerManagerRpcRoute, type ManagerRpcHost } from './rpc-channel.ts'
import { PerKeyQueue } from './keyed-queue.ts'

/** The settings service surface this controller reads. */
type SettingsFace = SettingsForms & {
  readonly documentPath?: string
  readonly writable?: boolean
  configure?(presentation: { auto?: boolean }, owner?: unknown): () => void
}

/** The workspace registry surface the project scope reads, when composed. */
interface WorkspaceRegistryLike {
  list?(): readonly { id: unknown; path: string; title?: string }[]
}

/** A tool schema as the panel needs it. */
interface ToolSchemaLike {
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, unknown>
}

/** Serialized endpoint dispatch key. */
const RELOAD_KEY = 'reload'

export class McpManagerController {
  private readonly queues = new PerKeyQueue()
  private readonly fleet: RegistrationFleet
  private readonly restrictions: { readonly agent: Agent; readonly dispose: () => void }[] = []
  private merged: MergedSources = { servers: [], sources: [], problems: [] }
  private projectPath: string | undefined
  private disposed = false
  private suppressRestrictionEvents = false
  private fileWatchDispose: (() => void) | undefined
  private rpcDispose: (() => Promise<void>) | undefined
  private guardDispose: (() => void) | undefined
  private configPresentationDispose: (() => void) | undefined
  private configWatchDispose: (() => void) | undefined

  /**
   * @param ctx - the Host plugin context carrying `tools`, `settings`, `connection`, and `mcpManager`.
   * @param config - this plugin's own volatile entry config (`disabledTools`).
   * @param env - ambient environment used for `${env:…}` expansion; tests substitute it.
   */
  constructor(
    private readonly ctx: Context,
    private readonly config: ManagerSettings,
    private readonly env: () => Readonly<Record<string, string | undefined>> = () => process.env,
  ) {
    this.fleet = new RegistrationFleet(ctx.mcpManager as unknown as RegistrationManager, () => this.env())
  }

  /** Start the RPC, the file watch, and the tool policy. */
  async start(): Promise<void> {
    validateDisabledTools(this.config.disabledTools.get() ?? {})
    const settings = this.settings()
    if (typeof settings.configure === 'function') {
      this.configPresentationDispose = settings.configure({ auto: false })
    }
    this.guardDispose = this.ctx.tools.guard(execution => {
      if (!execution.name.startsWith('mcp__')) return undefined
      return this.disabledToolNames().includes(execution.name) ? 'MCP tool is disabled in the MCP manager panel' : undefined
    })
    this.rpcDispose = registerManagerRpcRoute(
      this.ctx as unknown as Context & ManagerRpcHost,
      (endpoint, payload, signal) => this.handle(endpoint, payload, signal),
    )
    this.configWatchDispose = this.ctx.on('loader/volatile-update', (paths) => {
      if (this.disposed || !paths.some(path => path[0] === 'disabledTools')) return
      this.refreshRestrictions()
    })
    this.ctx.on('tools/change', () => {
      if (this.disposed || this.suppressRestrictionEvents) return
      this.refreshRestrictions()
    })
    this.ctx.on('agent/created', ({ agent }) => {
      this.installRestriction(agent)
      return undefined
    })
    this.ctx.on('agent/disposed', ({ agent }) => { this.removeRestriction(agent) })
    for (const agent of this.agents()) this.installRestriction(agent)
    await this.queues.enqueue(RELOAD_KEY, () => this.reload())
    await this.rearmWatch()
  }

  /** Dispose RPC, tool policy, file watch, and every registration this plugin owns. */
  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    this.configWatchDispose?.()
    this.configWatchDispose = undefined
    this.configPresentationDispose?.()
    this.configPresentationDispose = undefined
    this.fileWatchDispose?.()
    this.fileWatchDispose = undefined
    await this.queues.drain()
    for (const restriction of this.restrictions.splice(0)) restriction.dispose()
    this.guardDispose?.()
    this.guardDispose = undefined
    this.fleet.dispose()
    if (this.rpcDispose !== undefined) await this.rpcDispose()
    this.rpcDispose = undefined
  }

  /** Dispatch one authenticated Connection RPC endpoint. */
  async handle(endpoint: string, payload: unknown, signal: AbortSignal): Promise<RpcResult<unknown>> {
    if (this.disposed) return failure('aborted', 'the MCP manager is disposed')
    if (signal.aborted) return failure('aborted', 'operation was cancelled')
    try {
      switch (endpoint) {
        case 'snapshot':
          return success(await this.snapshot(parseSnapshotRequest(payload)))
        case 'upsertServer':
          return success(await this.upsert(parseUpsertRequest(payload)))
        case 'removeServer': {
          const request = parseRemoveRequest(payload)
          return success(await this.remove(request.id, request.projectPath))
        }
        case 'setServerEnabled': {
          const request = parseSetEnabledRequest(payload)
          return success(await this.setEnabled(request.id, request.enabled, request.projectPath))
        }
        case 'authorize':
          return success(await this.authorize(parseAuthorizeRequest(payload).name))
        case 'cancelAuthorization': {
          const request = parseCancelAuthorizationRequest(payload)
          return success(await this.cancelAuthorization(request.name, request.id))
        }
        case 'signOut':
          return success(await this.signOut(parseSignOutRequest(payload).name))
        default:
          return failure('bad-request', `unknown MCP manager endpoint ${JSON.stringify(endpoint)}`)
      }
    } catch (error) {
      return failure(classifyError(error), error instanceof Error ? error.message : String(error))
    }
  }

  // -------------------------------------------------------------- operations

  private snapshot(request: SnapshotRequest): Promise<Snapshot> {
    return this.queues.enqueue(RELOAD_KEY, async () => {
      const projectPath = this.resolveProject(request.projectPath)
      await this.activateProject(projectPath)
      await this.reload(projectPath)
      return this.buildSnapshot()
    })
  }

  private upsert(request: UpsertServerRequest): Promise<Snapshot> {
    return this.queues.enqueue(RELOAD_KEY, async () => {
      const projectPath = this.resolveProject(request.projectPath)
      await this.activateProject(projectPath)
      await this.reload(projectPath)
      const scope = request.scope ?? this.winning(request.server.id)?.scope ?? 'profile'
      const path = this.targetFile(scope, projectPath)
      const next = serverFromPatch(request.server)
      await mutateScopeFile(path, document => withServer(document, next.id, next))
      await this.reload(projectPath)
      return this.buildSnapshot()
    })
  }

  private remove(id: string, projectPathInput: string | undefined): Promise<Snapshot> {
    return this.queues.enqueue(RELOAD_KEY, async () => {
      const projectPath = this.resolveProject(projectPathInput)
      await this.activateProject(projectPath)
      await this.reload(projectPath)
      const winning = this.winning(id)
      if (winning === undefined) throw notFound(id)
      if (!winning.writable) throw notWritable(id, winning.path)
      await mutateScopeFile(winning.path, document => withServer(document, id, null))
      await this.reload(projectPath)
      return this.buildSnapshot()
    })
  }

  private setEnabled(id: string, enabled: boolean, projectPathInput: string | undefined): Promise<Snapshot> {
    return this.queues.enqueue(RELOAD_KEY, async () => {
      const projectPath = this.resolveProject(projectPathInput)
      await this.activateProject(projectPath)
      await this.reload(projectPath)
      const winning = this.winning(id)
      if (winning === undefined) throw notFound(id)
      if (!winning.writable) throw notWritable(id, winning.path)
      await mutateScopeFile(winning.path, (document) => {
        const raw = Object.hasOwn(document.servers, id) ? document.servers[id] : undefined
        if (raw === undefined) return undefined
        const normalized = normalizeServer(id, raw)
        if (!normalized.ok) throw new Error(normalized.error)
        return withServer(document, id, applyServerPatch(normalized.server, { id, enabled }))
      })
      await this.reload(projectPath)
      return this.buildSnapshot()
    })
  }

  /** Start (or resume) an OAuth attempt for a managed server. */
  private async authorize(name: string): Promise<AuthorizationResult> {
    this.assertManaged(name)
    const view = await this.ctx.mcpManager.startAuthorization(name)
    return authorizationResult(view)
  }

  /** Cancel one OAuth attempt by its manager-issued identity. */
  private async cancelAuthorization(name: string, id: string): Promise<null> {
    this.assertManaged(name)
    await this.ctx.mcpManager.cancelAuthorization(name, id as McpOAuthAttemptId)
    return null
  }

  /** Sign out of one managed server, deleting its local grant. */
  private async signOut(name: string): Promise<null> {
    this.assertManaged(name)
    await this.ctx.mcpManager.signOut(name)
    return null
  }

  private assertManaged(name: string): void {
    if (!this.ctx.mcpManager.list().some(view => view.name === name)) throw notFound(name)
  }

  // ----------------------------------------------------------------- sources

  private async reload(projectPath: string | undefined = this.projectPath): Promise<void> {
    const reads = await readScopeFiles(this.filesFor(projectPath))
    const merged = mergeSources({ scopes: reads })
    this.merged = merged
    this.fleet.reconcile(merged.servers.map(server => server.server))
  }

  /** Point the file scopes at one project root and re-arm the watcher when it changed. */
  private async activateProject(projectPath: string | undefined): Promise<void> {
    if (projectPath === this.projectPath) return
    this.projectPath = projectPath
    await this.rearmWatch()
  }

  private async rearmWatch(): Promise<void> {
    this.fileWatchDispose?.()
    this.fileWatchDispose = undefined
    if (this.disposed) return
    this.fileWatchDispose = await watchScopeFiles(this.filesFor(this.projectPath), () => {
      if (this.disposed) return
      void this.queues.enqueue(RELOAD_KEY, async () => {
        await this.reload(this.projectPath)
      }).catch((error: unknown) => {
        this.ctx.logger.warn(`dsh-mcp-manager: MCP configuration change reconciliation failed: ${String(error)}`)
      })
    })
  }

  private filesFor(projectPath: string | undefined): ScopeFile[] {
    return resolveScopeFiles({ profileDir: this.profileDir(), projectDir: projectPath })
  }

  private targetFile(scope: McpScope, projectPath: string | undefined): string {
    const file = this.filesFor(projectPath).find(entry => entry.scope === scope)
    if (file === undefined) {
      throw Object.assign(new Error(`the ${scope} scope has no writable file in this Host`), { code: 'MCP_SCOPE_UNAVAILABLE' })
    }
    return file.path
  }

  /** The active profile directory, as the settings provider reports it. */
  private profileDir(): string | undefined {
    const path = this.settings().documentPath
    return typeof path === 'string' && path !== '' ? dirname(path) : undefined
  }

  private resolveProject(projectPath: string | undefined): string | undefined {
    if (projectPath === undefined) return undefined
    const match = this.workspaces().find(workspace => workspace.path === projectPath)
    if (match === undefined) throw Object.assign(new Error(`project path ${JSON.stringify(projectPath)} is not a registered workspace`), { code: 'MCP_PROJECT_NOT_FOUND' })
    return match.path
  }

  private winning(id: string): SourcedServer | undefined {
    return this.merged.servers.find(server => server.id === id)
  }

  /** Registered workspaces the panel may root the project scope at. */
  private workspaces(): WorkspaceView[] {
    const registry = this.ctx.get('workspaceRegistry') as WorkspaceRegistryLike | undefined
    if (registry?.list === undefined) return []
    return toWorkspaceViews(registry.list().map(workspace => ({
      id: String(workspace.id),
      path: workspace.path,
      ...workspace.title === undefined ? {} : { title: workspace.title },
    })))
  }

  // ---------------------------------------------------------------- snapshot

  private buildSnapshot(): Snapshot {
    const disabled = this.disabledToolNames()
    const managedNames = this.ctx.mcpManager.list().map(view => view.name)
    const snapshot: Snapshot = {
      writable: this.settings().writable ?? true,
      servers: this.merged.servers.map(server => toServerView(server, this.fleet.outcome(server.id))),
      tools: this.readTools(disabled, managedNames),
      sources: this.merged.sources,
      workspaces: this.workspaces(),
      ...this.projectPath === undefined ? {} : { projectPath: this.projectPath },
    }
    return snapshot
  }

  private readTools(disabled: readonly string[], managedNames: readonly string[]): ManagedToolView[] {
    const names = [...new Set([...this.merged.servers.map(server => server.id), ...managedNames])]
      .sort((left, right) => right.length - left.length)
    const schemas = this.ctx.tools.schemas() as unknown as readonly ToolSchemaLike[]
    return schemas
      .filter(schema => schema.name.startsWith('mcp__'))
      .map(schema => ({
        name: schema.name,
        serverId: names.find(name => schema.name.startsWith(`mcp__${name}__`)) ?? serverIdFromToolName(schema.name),
        description: schema.description ?? '',
        parameters: schema.parameters ?? {},
        enabled: !disabled.includes(schema.name),
      }))
  }

  private disabledToolNames(): string[] {
    return [...new Set(Object.values(this.config.disabledTools.get() ?? {}).flat())]
  }

  private settings(): SettingsFace {
    return this.ctx.settings as unknown as SettingsFace
  }

  // ------------------------------------------------------------ tool policy

  private agents(): Agent[] {
    return (this.ctx.get('agents') as { list?(): Agent[] } | undefined)?.list?.() ?? []
  }

  private installRestriction(agent: Agent): void {
    if (this.restrictions.some(entry => entry.agent === agent)) return
    const tools = (agent.ctx as unknown as { tools?: ToolRuntime }).tools
    if (tools === undefined) return
    const names = this.disabledToolNames().filter(name => this.ctx.tools.get(name, agent) !== undefined)
    if (names.length === 0) return
    const previous = this.suppressRestrictionEvents
    this.suppressRestrictionEvents = true
    try {
      const dispose = tools.restrict({ deny: names })
      this.restrictions.push({ agent, dispose })
    } catch (error) {
      this.ctx.logger.warn(`dsh-mcp-manager: could not install restrictions for agent ${String(agent.id)}: ${String(error)}`)
    } finally {
      this.suppressRestrictionEvents = previous
    }
  }

  private removeRestriction(agent: Agent): void {
    for (let index = this.restrictions.length - 1; index >= 0; index--) {
      const entry = this.restrictions[index]
      if (entry?.agent !== agent) continue
      const previous = this.suppressRestrictionEvents
      this.suppressRestrictionEvents = true
      try { entry.dispose() } finally { this.suppressRestrictionEvents = previous }
      this.restrictions.splice(index, 1)
    }
  }

  private refreshRestrictions(): void {
    if (this.disposed || this.suppressRestrictionEvents) return
    const previous = this.suppressRestrictionEvents
    this.suppressRestrictionEvents = true
    try {
      const agents = this.agents()
      for (const restriction of this.restrictions.splice(0)) restriction.dispose()
      for (const agent of agents) this.installRestriction(agent)
    } finally {
      this.suppressRestrictionEvents = previous
    }
  }
}

/** `mcp__<server>__<tool>` when the server is not (or no longer) known to the snapshot. */
function serverIdFromToolName(name: string): string {
  const match = /^mcp__(?<server>[^_].*?)__(?<tool>.+)$/u.exec(name)
  return match?.groups?.server ?? ''
}

function authorizationResult(view: McpOAuthAttemptView): AuthorizationResult {
  return {
    id: view.id,
    phase: view.phase,
    ...view.authorizationUrl === undefined ? {} : { authorizationUrl: view.authorizationUrl },
    ...view.lastError === undefined ? {} : { lastError: view.lastError },
  }
}

function success<T>(value: T): RpcResult<T> {
  return { ok: true, value }
}

function failure(code: RpcError['code'], message: string): RpcResult<never> {
  return { ok: false, error: { code, message } }
}

function notFound(id: string): Error {
  return Object.assign(new Error(`MCP server ${JSON.stringify(id)} is not defined by any mcp.json file`), { code: 'MCP_NOT_FOUND' })
}

function notWritable(id: string, path: string): Error {
  return Object.assign(new Error(`MCP server ${JSON.stringify(id)} is defined by the read-only file ${path}`), { code: 'MCP_NOT_WRITABLE' })
}

function classifyError(error: unknown): RpcError['code'] {
  const code = (error as { code?: unknown } | null)?.code
  if (code === 'MCP_CONFIG_VALIDATION') return 'validation'
  if (code === 'MCP_NOT_FOUND') return 'not-found'
  if (code === 'MCP_NOT_WRITABLE') return 'not-writable'
  if (code === 'MCP_SCOPE_UNAVAILABLE' || code === 'MCP_PROJECT_NOT_FOUND') return 'validation'
  if (error instanceof TypeError) return 'bad-request'
  const message = error instanceof Error ? error.message : String(error)
  if (/already configured or registered/u.test(message)) return 'conflict'
  if (/unknown server|not defined by any/u.test(message)) return 'not-found'
  if (/read-only/u.test(message)) return 'not-writable'
  if (/needs a command|needs a URL|invalid URL|must be|must not|contains an|is not a registered workspace|missing environment|unsupported MCP transport|OAuth/u.test(message)) return 'validation'
  return 'internal'
}
