/** Shared JSON-safe contracts for the Host RPC and the browser panel. */

/**
 * Shared channel carrying the manager's authenticated RPC.
 *
 * The manager rides the Connection service's own `/api` channel instead of
 * claiming a private prefix route:
 *
 * - The physical `/api` route is mounted by `@deepseek-ai/dsh-client-connection`
 *   itself and applies the Host/Origin fence plus browser authentication before
 *   anything reaches a handler, so this plugin never repeats that logic.
 * - `connection.rpc.handle(channel, …)` cannot be used: its `register()` mounts
 *   the physical route through `owner.webServer` where `owner` is the Connection
 *   service's own Context, which fails with `cannot get property "webServer"
 *   without inject`.
 * - `connection.rpc.intercept('/api', …)` cannot be used either: the shared
 *   channel accepts exactly one interceptor and `@deepseek-ai/dsh-api-gateway`
 *   already owns it.
 * - `connection.fetch.register()` is therefore the supported path: one exact
 *   Fetch route per endpoint, taking precedence over the interceptor.
 */
export const MCP_MANAGER_API_CHANNEL = '/api' as const
/** Endpoint prefix this plugin owns inside the shared channel. */
export const MCP_MANAGER_ENDPOINT_PREFIX = 'mcp-manager' as const

/**
 * Every manager endpoint, in registration order.
 *
 * The `mcp.json` file scopes are written through this private protocol because
 * no shared service owns those files. Everything the official MCP manager
 * already governs is **not** mirrored here: live status and restart/probe go
 * through `ctx.remote.mcpManager`, configuration of the official
 * `mcp-manager` entry goes through the shared settings form
 * (`ctx.configForms`), and the per-tool policy of this plugin goes through its
 * own entry form. The three authorization endpoints exist because the official
 * manager exposes `startAuthorization` / `cancelAuthorization` / `signOut` on
 * the Host only; they name a server the manager already lists and add no write
 * path of their own.
 */
export const MCP_MANAGER_ENDPOINTS = [
  'snapshot',
  'upsertServer',
  'removeServer',
  'setServerEnabled',
  'authorize',
  'cancelAuthorization',
  'signOut',
] as const

/** The Loader entry id this plugin's Host half is mounted under, and its settings namespace. */
export const MCP_MANAGER_NAMESPACE = 'dsh-mcp-manager' as const

/**
 * The official MCP manager's Loader entry id in the `dsh-web-app` composition.
 * It is the settings namespace the panel writes `servers` through.
 */
export const MCP_UPSTREAM_NAMESPACE = 'mcp-manager' as const

export type ManagerRpcEndpoint = typeof MCP_MANAGER_ENDPOINTS[number]

/**
 * Absolute exact Fetch-route path for one endpoint.
 *
 * The browser client posts to `<channel>/<endpoint>`, its channel grammar
 * (`/^\/[A-Za-z0-9._~-]+$/`) admits a single segment only, so the channel is
 * `/api` and the endpoint string carries the `mcp-manager/` prefix.
 * @param endpoint - one manager endpoint name.
 * @returns the path registered through `connection.fetch.register()`.
 */
export function mcpManagerRoutePath(endpoint: ManagerRpcEndpoint): string {
  return `${MCP_MANAGER_API_CHANNEL}/${MCP_MANAGER_ENDPOINT_PREFIX}/${endpoint}`
}

export type ServerTransport = 'stdio' | 'streamable-http'
export type ToolLoading = 'eager' | 'on-demand'

/** Every `mcp.json` scope this plugin owns, in precedence order. */
export const MCP_SCOPES = ['project', 'profile', 'user'] as const
export type McpScope = typeof MCP_SCOPES[number]

export interface ReconnectPolicy {
  enabled: boolean
  initialDelayMs: number
  maxDelayMs: number
  maxAttempts: number
}

/** OAuth settings carried by one server entry; the credential value itself never appears here. */
export interface OAuthPolicy {
  /** `mcp-client/<id>`; the credential store reference, never the token. */
  credentialKey: string
  clientId?: string
  scope?: string
  requestTimeoutMs: number
  authorizationTimeoutMs: number
}

/** Secret values never cross the RPC boundary; only this state does. */
export interface SecretState {
  readonly set: boolean
  /** Whether the stored value should be masked in the panel (sensitive key). */
  readonly sensitive: boolean
  /** Whether the value is an environment template (`${env:NAME}`) rather than a literal. */
  readonly template: boolean
  /** Whether the value is a credential template (`${credential:REF}`) resolved by the official client. */
  readonly credential: boolean
}

/** One `mcp.json` source row as the panel renders it. */
export interface McpSourceView {
  readonly scope: McpScope
  readonly path: string
  readonly writable: boolean
  /** Another client's file merged below this scope's own file. */
  readonly compat: boolean
  readonly exists: boolean
  readonly serverCount: number
  readonly error?: string
  /** Per-entry failures inside an otherwise readable file. */
  readonly problems?: readonly { readonly id: string; readonly error: string }[]
}

/** One workspace the project scope may be rooted at. */
export interface WorkspaceView {
  readonly id: string
  readonly path: string
  readonly title: string
}

/** Environment/credential variables one stored server keeps as templates. */
export interface ServerTemplates {
  readonly env: readonly string[]
  readonly headers: readonly string[]
  /** Values that reference the official credential store (`${credential:…}`). */
  readonly credentials: readonly string[]
}

export interface ManagedServerView {
  readonly id: string
  readonly label: string
  readonly enabled: boolean
  readonly transport: ServerTransport
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly url: string
  readonly env: Readonly<Record<string, SecretState>>
  readonly headers: Readonly<Record<string, SecretState>>
  readonly toolCallTimeoutMs: number
  readonly startupTimeoutMs: number
  readonly closeTimeoutMs: number
  readonly reconnect: ReconnectPolicy
  readonly toolLoading: ToolLoading
  readonly oauth?: OAuthPolicy
  /** The scope whose definition won, and the file that definition lives in. */
  readonly scope: McpScope
  readonly path: string
  /** Whether the winning definition's file is writable by this Host. */
  readonly writable: boolean
  /** Lower-precedence definitions of the same name that lost. */
  readonly shadowed: readonly McpScope[]
  /** Values this server keeps as templates rather than literals. */
  readonly templates: ServerTemplates
  /** Whether the Host registered this server with the official MCP manager. */
  readonly registration: RegistrationView
}

/** Outcome of projecting one file server into the official manager's registration. */
export interface RegistrationView {
  readonly state: 'registered' | 'disabled' | 'missing-env' | 'invalid' | 'conflict' | 'error'
  readonly error?: string
  readonly missing?: readonly string[]
}

export interface ManagedToolView {
  readonly name: string
  readonly serverId: string
  readonly description: string
  readonly parameters: Record<string, unknown>
  readonly enabled: boolean
}

export interface Snapshot {
  readonly writable: boolean
  readonly servers: readonly ManagedServerView[]
  readonly tools: readonly ManagedToolView[]
  /** Every `mcp.json` source row. */
  readonly sources: readonly McpSourceView[]
  /** Registered workspaces the project scope may be rooted at. */
  readonly workspaces: readonly WorkspaceView[]
  /** The project root this snapshot was resolved against, when one was selected. */
  readonly projectPath?: string
}

export interface SecretPatch {
  /** Set a new value. Empty strings are valid values and are not a clear. */
  readonly value?: string
  /** Explicitly remove the stored value. */
  readonly clear?: boolean
}

export type SecretInput = string | SecretPatch

export interface ServerPatch {
  readonly id: string
  /** Target scope for this write; the panel defaults to the winning scope. */
  readonly scope?: McpScope
  readonly label?: string
  readonly enabled?: boolean
  readonly transport?: ServerTransport
  readonly command?: string
  readonly args?: readonly string[]
  readonly cwd?: string
  readonly url?: string
  readonly env?: Readonly<Record<string, SecretInput>>
  readonly headers?: Readonly<Record<string, SecretInput>>
  /** Keys of `env` whose values must be masked in the panel (full list semantics). */
  readonly envSensitive?: readonly string[]
  /** Keys of `headers` whose values must be masked in the panel (full list semantics). */
  readonly headerSensitive?: readonly string[]
  readonly toolCallTimeoutMs?: number
  readonly startupTimeoutMs?: number
  readonly closeTimeoutMs?: number
  readonly reconnect?: Partial<ReconnectPolicy>
  readonly toolLoading?: ToolLoading
  /** `null` removes the policy; an object replaces it. */
  readonly oauth?: OAuthPolicy | null
}

/**
 * Where a write lands.
 *
 * A `project` scope is only accepted when `projectPath` names a registered
 * workspace root; the Host never writes outside a root it can prove.
 */
export interface ScopeTarget {
  readonly scope?: McpScope
  readonly projectPath?: string
}

export type SnapshotRequest = ScopeTarget

export interface UpsertServerRequest extends ScopeTarget {
  readonly server: ServerPatch
}

export interface RemoveServerRequest extends ScopeTarget {
  readonly id: string
}

export interface SetServerEnabledRequest extends ScopeTarget {
  readonly id: string
  readonly enabled: boolean
}

export interface AuthorizeRequest {
  readonly name: string
}

export interface CancelAuthorizationRequest {
  readonly name: string
  /** Identity the manager issued for the attempt being cancelled. */
  readonly id: string
}

export interface SignOutRequest {
  readonly name: string
}

/** Result of the authorization endpoints: the manager's attempt view, without any credential material. */
export interface AuthorizationResult {
  readonly id: string
  readonly phase: 'starting' | 'waiting-browser' | 'exchanging' | 'committing' | 'authorized' | 'cancelled' | 'failed'
  readonly authorizationUrl?: string
  readonly lastError?: string
}

export interface RpcError {
  readonly code:
  | 'bad-request'
  | 'not-found'
  | 'not-writable'
  | 'validation'
  | 'conflict'
  | 'internal'
  | 'aborted'
  readonly message: string
  readonly details?: Record<string, unknown>
}

export type RpcResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RpcError }

/** Actual Host-only stored shape. Secret values are kept here and nowhere in a view. */
export interface StoredServer {
  id: string
  label: string
  enabled: boolean
  transport: ServerTransport
  command: string
  args: string[]
  cwd: string
  url: string
  env: Record<string, string>
  headers: Record<string, string>
  /** Keys of `env` whose values are masked in the panel (full list, persisted). */
  envSensitive: string[]
  /** Keys of `headers` whose values are masked in the panel (full list, persisted). */
  headerSensitive: string[]
  toolCallTimeoutMs: number
  startupTimeoutMs: number
  closeTimeoutMs: number
  reconnect: ReconnectPolicy
  toolLoading: ToolLoading
  oauth?: OAuthPolicy
}

export interface StoredServerPatch {
  readonly id: string
  readonly label?: string
  readonly enabled?: boolean
  readonly transport?: ServerTransport
  readonly command?: string
  readonly args?: readonly string[]
  readonly cwd?: string
  readonly url?: string
  readonly env?: Readonly<Record<string, SecretInput>>
  readonly headers?: Readonly<Record<string, SecretInput>>
  readonly envSensitive?: readonly string[]
  readonly headerSensitive?: readonly string[]
  readonly toolCallTimeoutMs?: number
  readonly startupTimeoutMs?: number
  readonly closeTimeoutMs?: number
  readonly reconnect?: Partial<ReconnectPolicy>
  readonly toolLoading?: ToolLoading
  readonly oauth?: OAuthPolicy | null
}

export function isRpcResult<T>(value: unknown): value is RpcResult<T> {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (record.ok === true) return 'value' in record
  if (record.ok !== false || typeof record.error !== 'object' || record.error === null) return false
  const error = record.error as Record<string, unknown>
  return typeof error.code === 'string' && typeof error.message === 'string'
}

/** 插件的社区注册身份(GitHub owner/repo)。 */
export const PLUGIN_IDENTITY = 'junjiangao/dsh-mcp-manager' as const
/** 插件安装后的 npm 包名 / loader 模块名(bundle 层与 patch 条目 name)。 */
export const PLUGIN_MODULE_NAME = '@junjiangao/dsh-mcp-manager' as const
