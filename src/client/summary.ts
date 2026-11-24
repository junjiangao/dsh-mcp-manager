/** Merge the three data sources (file snapshot, official manager stream, entry form) into one row model. */

import type { McpManagedServerView } from '@deepseek-ai/dsh-mcp-manager'
import { DEFAULT_CLOSE_TIMEOUT_MS, DEFAULT_RECONNECT, DEFAULT_STARTUP_TIMEOUT_MS, DEFAULT_TOOL_CALL_TIMEOUT_MS } from '../server-config.ts'
import type {
  ManagedServerView, ManagedToolView, McpScope, OAuthPolicy, ReconnectPolicy, RegistrationView, SecretState, ServerTemplates,
  ServerTransport, Snapshot, ToolLoading,
} from '../types.ts'

/** One server as stored in the official `mcp-manager.servers` map; every field is optional. */
export interface EntryServer {
  transport?: ServerTransport
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
  enabled?: boolean
  toolCallTimeoutMs?: number
  startupTimeoutMs?: number
  closeTimeoutMs?: number
  reconnect?: Partial<ReconnectPolicy>
  toolLoading?: ToolLoading
  oauth?: OAuthPolicy
}

/** The official manager's volatile configuration shape. */
export interface UpstreamConfig {
  servers?: Record<string, EntryServer>
}

/** One environment/header row: a redacted file value or a visible entry value. */
export interface MapRow {
  readonly key: string
  readonly value?: string
  readonly state?: SecretState
}

export interface ServerSummary {
  readonly name: string
  readonly kind: 'entry' | 'file'
  readonly label: string
  readonly enabled: boolean
  readonly transport: ServerTransport
  readonly scope?: McpScope
  readonly path?: string
  readonly writable: boolean
  readonly compat: boolean
  readonly shadowed: readonly McpScope[]
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly url: string
  readonly env: readonly MapRow[]
  readonly headers: readonly MapRow[]
  readonly toolCallTimeoutMs: number
  readonly startupTimeoutMs: number
  readonly closeTimeoutMs: number
  readonly reconnect: ReconnectPolicy
  readonly toolLoading: ToolLoading
  readonly oauth?: OAuthPolicy
  readonly templates?: ServerTemplates
  readonly registration?: RegistrationView
  readonly runtime?: McpManagedServerView
  readonly tools: readonly ManagedToolView[]
  readonly disabledTools: readonly string[]
  readonly entry?: EntryServer
  readonly file?: ManagedServerView
  /** The name exists both as an official config entry and in a file. */
  readonly conflict: boolean
}

export type SourceFilter = 'all' | 'entry' | 'file'
export type StatusFilter = 'all' | 'connected' | 'busy' | 'attention' | 'disabled' | 'unknown'

/**
 * Merge every source into panel rows.
 * @param snapshot - the Host's file view, or `undefined` while loading.
 * @param managed - the official manager's status stream.
 * @param entryServers - `mcp-manager.servers` values from the shared form.
 * @param disabledTools - this plugin's per-server disabled tool names.
 * @param entryWritable - whether the official form accepts writes.
 * @returns entry servers first, then file servers, each sorted by name.
 */
export function buildSummaries(
  snapshot: Snapshot | undefined,
  managed: readonly McpManagedServerView[],
  entryServers: Readonly<Record<string, EntryServer>>,
  disabledTools: Readonly<Record<string, readonly string[]>>,
  entryWritable: boolean,
): ServerSummary[] {
  const runtimes = new Map(managed.map(view => [view.name, view]))
  const fileServers = snapshot?.servers ?? []
  const toolsByServer = new Map<string, ManagedToolView[]>()
  for (const tool of snapshot?.tools ?? []) {
    const list = toolsByServer.get(tool.serverId) ?? []
    list.push(tool)
    toolsByServer.set(tool.serverId, list)
  }
  const fileNames = new Set(fileServers.map(server => server.id))
  const entryNames = new Set(Object.keys(entryServers))

  const rows: ServerSummary[] = []
  for (const name of [...entryNames].sort((left, right) => left.localeCompare(right))) {
    const entry = entryServers[name] ?? {}
    rows.push(entrySummary(name, entry, runtimes.get(name), toolsByServer.get(name) ?? [], disabledTools[name] ?? [], entryWritable, fileNames.has(name)))
  }
  for (const server of fileServers) {
    rows.push(fileSummary(server, runtimes.get(server.id), toolsByServer.get(server.id) ?? [], disabledTools[server.id] ?? [], entryNames.has(server.id)))
  }
  return rows
}

function entrySummary(
  name: string,
  entry: EntryServer,
  runtime: McpManagedServerView | undefined,
  tools: readonly ManagedToolView[],
  disabled: readonly string[],
  writable: boolean,
  conflict: boolean,
): ServerSummary {
  const transport: ServerTransport = entry.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
  return {
    name,
    kind: 'entry',
    label: name,
    enabled: entry.enabled !== false,
    transport,
    writable,
    compat: false,
    shadowed: [],
    command: entry.command ?? '',
    args: [...entry.args ?? []],
    cwd: entry.cwd ?? '',
    url: entry.url ?? '',
    env: mapRows(entry.env),
    headers: mapRows(entry.headers),
    toolCallTimeoutMs: entry.toolCallTimeoutMs ?? DEFAULT_TOOL_CALL_TIMEOUT_MS,
    startupTimeoutMs: entry.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS,
    closeTimeoutMs: entry.closeTimeoutMs ?? DEFAULT_CLOSE_TIMEOUT_MS,
    reconnect: { ...DEFAULT_RECONNECT, ...entry.reconnect },
    toolLoading: entry.toolLoading === 'on-demand' ? 'on-demand' : 'eager',
    ...entry.oauth === undefined ? {} : { oauth: entry.oauth },
    ...runtime === undefined ? {} : { runtime },
    tools,
    disabledTools: disabled,
    entry,
    conflict,
  }
}

function fileSummary(
  server: ManagedServerView,
  runtime: McpManagedServerView | undefined,
  tools: readonly ManagedToolView[],
  disabled: readonly string[],
  conflict: boolean,
): ServerSummary {
  return {
    name: server.id,
    kind: 'file',
    label: server.label,
    enabled: server.enabled,
    transport: server.transport,
    scope: server.scope,
    path: server.path,
    writable: server.writable,
    compat: server.scope === 'project' && server.writable === false,
    shadowed: server.shadowed,
    command: server.command,
    args: [...server.args],
    cwd: server.cwd,
    url: server.url,
    env: secretRows(server.env),
    headers: secretRows(server.headers),
    toolCallTimeoutMs: server.toolCallTimeoutMs,
    startupTimeoutMs: server.startupTimeoutMs,
    closeTimeoutMs: server.closeTimeoutMs,
    reconnect: { ...server.reconnect },
    toolLoading: server.toolLoading,
    ...server.oauth === undefined ? {} : { oauth: server.oauth },
    templates: server.templates,
    registration: server.registration,
    ...runtime === undefined ? {} : { runtime },
    tools,
    disabledTools: disabled,
    file: server,
    conflict,
  }
}

function mapRows(values: Readonly<Record<string, string>> | undefined): MapRow[] {
  return Object.entries(values ?? {}).map(([key, value]) => ({ key, value }))
}

function secretRows(values: Readonly<Record<string, SecretState>>): MapRow[] {
  return Object.entries(values).map(([key, state]) => ({ key, state }))
}

/** The status bucket a row belongs to, for the status filter. */
export function statusBucket(runtime: McpManagedServerView | undefined): Exclude<StatusFilter, 'all'> {
  const state = runtime?.status.state
  if (state === 'connected') return 'connected'
  if (state === 'connecting' || state === 'reconnecting') return 'busy'
  if (state === 'waiting-credentials' || state === 'waiting-authorization' || state === 'failed') return 'attention'
  if (state === 'disabled') return 'disabled'
  return 'unknown'
}

/** Filter rows by search text, source, and status bucket. */
export function filterSummaries(
  rows: readonly ServerSummary[],
  query: string,
  source: SourceFilter,
  status: StatusFilter,
): ServerSummary[] {
  const needle = query.trim().toLocaleLowerCase()
  return rows.filter((row) => {
    if (source !== 'all' && row.kind !== source) return false
    if (status !== 'all' && statusBucket(row.runtime) !== status) return false
    if (needle === '') return true
    const haystack = [
      row.name, row.label, row.command, row.url, row.cwd, ...row.args,
      ...row.env.map(entry => entry.key), ...row.headers.map(entry => entry.key),
      ...row.tools.map(tool => `${tool.name} ${tool.description}`),
      row.scope ?? '',
    ].join('\n').toLocaleLowerCase()
    return haystack.includes(needle)
  })
}

/**
 * Serialize one row as the `mcp.json` entry it would be written as, for the copy action.
 * @param row - the row to render.
 * @returns pretty-printed JSON.
 */
export function rowToJson(row: ServerSummary): string {
  const entry: Record<string, unknown> = { type: row.transport === 'stdio' ? 'stdio' : 'http' }
  if (row.transport === 'stdio') {
    entry.command = row.command
    entry.args = [...row.args]
    if (row.cwd !== '') entry.cwd = row.cwd
    if (row.env.length > 0) entry.env = Object.fromEntries(row.env.map(item => [item.key, item.value ?? '']))
  } else {
    entry.url = row.url
    if (row.headers.length > 0) entry.headers = Object.fromEntries(row.headers.map(item => [item.key, item.value ?? '']))
  }
  if (!row.enabled) entry.enabled = false
  if (row.toolLoading !== 'eager') entry.toolLoading = row.toolLoading
  if (row.oauth !== undefined) entry.oauth = { ...row.oauth }
  return `${JSON.stringify(entry, null, 2)}\n`
}
