/** Runtime validation and redacted projections for the manager RPC. */

import type {
  AuthorizeRequest, CancelAuthorizationRequest, ManagedServerView, McpScope, OAuthPolicy, ReconnectPolicy, RegistrationView,
  SecretInput, SecretState, ServerPatch, ServerTemplates, SetServerEnabledRequest, ScopeTarget, SignOutRequest, SnapshotRequest,
  StoredServer, UpsertServerRequest, WorkspaceView,
} from './types.ts'
import { MCP_SCOPES } from './types.ts'
import {
  DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS, DEFAULT_OAUTH_REQUEST_TIMEOUT_MS, defaultServer, isCredentialTemplate, isTemplatedValue,
  transportOf, validateReconnect, validateServerConfig, validateServerId,
} from './server-config.ts'

const MAX_LABEL_LENGTH = 120
const MAX_ARGUMENTS = 128
const MAX_TIMEOUT = 2_147_483_647

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(message)
  return value
}

export function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new TypeError(`${field} must be a string`)
  return value
}

export function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${field} must be a boolean`)
  return value
}

export function asNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${field} must be a number`)
  return value
}

export function parseSnapshotRequest(value: unknown): SnapshotRequest {
  const record = asRecord(value ?? {}, 'snapshot payload must be an object')
  return parseScopeTarget(record)
}

/** Read the optional scope/project selection every mutating endpoint accepts. */
function parseScopeTarget(record: Record<string, unknown>): ScopeTarget {
  const scope = record.scope === undefined ? undefined : asScope(record.scope, 'scope')
  const projectPath = record.projectPath === undefined ? undefined : asString(record.projectPath, 'projectPath')
  if (projectPath !== undefined && !isAbsolutePath(projectPath)) {
    throw new TypeError('projectPath must be an absolute path')
  }
  return {
    ...scope === undefined ? {} : { scope },
    ...projectPath === undefined ? {} : { projectPath },
  }
}

function asScope(value: unknown, field: string): McpScope {
  if (typeof value !== 'string' || !(MCP_SCOPES as readonly string[]).includes(value)) {
    throw new TypeError(`${field} must be one of ${MCP_SCOPES.map(scope => JSON.stringify(scope)).join(', ')}`)
  }
  return value as McpScope
}

/** POSIX absolute, Windows drive, or UNC — the spellings a Workspace root uses. */
function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(path) || path.startsWith('\\\\')
}

export function parseUpsertRequest(value: unknown): UpsertServerRequest {
  const record = asRecord(value, 'upsertServer payload must be an object')
  return { ...parseScopeTarget(record), server: parseServerPatch(asRecord(record.server, 'server must be an object')) }
}

export function parseRemoveRequest(value: unknown): { id: string } & ScopeTarget {
  const record = asRecord(value, 'removeServer payload must be an object')
  const id = asString(record.id, 'id')
  validateServerId(id)
  return { id, ...parseScopeTarget(record) }
}

export function parseSetEnabledRequest(value: unknown): SetServerEnabledRequest {
  const record = asRecord(value, 'setServerEnabled payload must be an object')
  return { ...parseRemoveRequest(record), enabled: asBoolean(record.enabled, 'enabled') }
}

export function parseAuthorizeRequest(value: unknown): AuthorizeRequest {
  const record = asRecord(value, 'authorize payload must be an object')
  return { name: parseServerName(record.name) }
}

export function parseCancelAuthorizationRequest(value: unknown): CancelAuthorizationRequest {
  const record = asRecord(value, 'cancelAuthorization payload must be an object')
  return {
    name: parseServerName(record.name),
    id: requireText(record.id, 'id', 256),
  }
}

export function parseSignOutRequest(value: unknown): SignOutRequest {
  const record = asRecord(value, 'signOut payload must be an object')
  return { name: parseServerName(record.name) }
}

function parseServerName(value: unknown): string {
  const name = asString(value, 'name')
  validateServerId(name)
  return name
}

function requireText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    throw new TypeError(`${field} must be a non-empty string of at most ${String(max)} characters`)
  }
  return value
}

/** Validate one server patch coming from the browser. */
export function parseServerPatch(record: Record<string, unknown>): ServerPatch {
  const id = requireText(record.id, 'server.id', 32)
  validateServerId(id)
  const patch: ServerPatch = { id }
  const set = <K extends keyof ServerPatch>(key: K, value: ServerPatch[K]): void => {
    Object.assign(patch, { [key]: value })
  }
  if (record.label !== undefined) {
    const label = asString(record.label, 'server.label')
    if (label.length > MAX_LABEL_LENGTH) throw new TypeError(`server.label must be at most ${String(MAX_LABEL_LENGTH)} characters`)
    set('label', label)
  }
  if (record.enabled !== undefined) set('enabled', asBoolean(record.enabled, 'server.enabled'))
  if (record.transport !== undefined) set('transport', transportOf(asString(record.transport, 'server.transport')))
  if (record.command !== undefined) set('command', asString(record.command, 'server.command'))
  if (record.cwd !== undefined) set('cwd', asString(record.cwd, 'server.cwd'))
  if (record.url !== undefined) set('url', asString(record.url, 'server.url'))
  if (record.args !== undefined) {
    if (!Array.isArray(record.args) || record.args.length > MAX_ARGUMENTS || record.args.some(arg => typeof arg !== 'string')) {
      throw new TypeError(`server.args must be an array of at most ${String(MAX_ARGUMENTS)} strings`)
    }
    set('args', [...record.args as string[]])
  }
  if (record.env !== undefined) set('env', parseSecretMap(record.env, 'server.env'))
  if (record.headers !== undefined) set('headers', parseSecretMap(record.headers, 'server.headers'))
  if (record.envSensitive !== undefined) set('envSensitive', parseStringList(record.envSensitive, 'server.envSensitive'))
  if (record.headerSensitive !== undefined) set('headerSensitive', parseStringList(record.headerSensitive, 'server.headerSensitive'))
  if (record.toolCallTimeoutMs !== undefined) set('toolCallTimeoutMs', positiveInteger(record.toolCallTimeoutMs, 'server.toolCallTimeoutMs'))
  if (record.startupTimeoutMs !== undefined) set('startupTimeoutMs', positiveInteger(record.startupTimeoutMs, 'server.startupTimeoutMs'))
  if (record.closeTimeoutMs !== undefined) set('closeTimeoutMs', positiveInteger(record.closeTimeoutMs, 'server.closeTimeoutMs'))
  if (record.reconnect !== undefined) {
    const reconnect = asRecord(record.reconnect, 'server.reconnect must be an object')
    const partial: Partial<ReconnectPolicy> = {}
    if (reconnect.enabled !== undefined) partial.enabled = asBoolean(reconnect.enabled, 'server.reconnect.enabled')
    if (reconnect.initialDelayMs !== undefined) partial.initialDelayMs = positiveInteger(reconnect.initialDelayMs, 'server.reconnect.initialDelayMs')
    if (reconnect.maxDelayMs !== undefined) partial.maxDelayMs = positiveInteger(reconnect.maxDelayMs, 'server.reconnect.maxDelayMs')
    if (reconnect.maxAttempts !== undefined) partial.maxAttempts = positiveInteger(reconnect.maxAttempts, 'server.reconnect.maxAttempts')
    set('reconnect', partial)
  }
  if (record.toolLoading !== undefined) {
    const value = asString(record.toolLoading, 'server.toolLoading')
    if (value !== 'eager' && value !== 'on-demand') throw new TypeError('server.toolLoading must be "eager" or "on-demand"')
    set('toolLoading', value)
  }
  if (record.oauth !== undefined) {
    set('oauth', record.oauth === null ? null : parseOAuthPolicy(asRecord(record.oauth, 'server.oauth must be an object or null')))
  }
  return patch
}

function parseSecretMap(value: unknown, field: string): Record<string, SecretInput> {
  const record = asRecord(value, `${field} must be an object`)
  const map: Record<string, SecretInput> = {}
  for (const [key, entry] of Object.entries(record)) {
    if (key.trim() === '' || key.length > 256) throw new TypeError(`${field} contains an invalid key`)
    if (typeof entry === 'string') {
      map[key] = entry
      continue
    }
    const patch = asRecord(entry, `${field}.${key} must be a string or a patch object`)
    const secret: { value?: string; clear?: boolean } = {}
    if (patch.value !== undefined) secret.value = asString(patch.value, `${field}.${key}.value`)
    if (patch.clear !== undefined) secret.clear = asBoolean(patch.clear, `${field}.${key}.clear`)
    // `{}` keeps the stored value: the browser holds only a masked projection,
    // so an unchanged secret must be distinguishable from a cleared one.
    map[key] = secret.value === undefined && secret.clear !== true ? {} : secret
  }
  return map
}

function parseStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string' || entry.trim() === '')) {
    throw new TypeError(`${field} must be an array of non-empty strings`)
  }
  return [...value as string[]]
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > MAX_TIMEOUT) {
    throw new TypeError(`${field} must be an integer from 1 to ${String(MAX_TIMEOUT)}`)
  }
  return value
}

function parseOAuthPolicy(record: Record<string, unknown>): OAuthPolicy {
  const policy: OAuthPolicy = {
    credentialKey: requireText(record.credentialKey, 'oauth.credentialKey', 256),
    requestTimeoutMs: record.requestTimeoutMs === undefined
      ? DEFAULT_OAUTH_REQUEST_TIMEOUT_MS
      : positiveInteger(record.requestTimeoutMs, 'oauth.requestTimeoutMs'),
    authorizationTimeoutMs: record.authorizationTimeoutMs === undefined
      ? DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS
      : positiveInteger(record.authorizationTimeoutMs, 'oauth.authorizationTimeoutMs'),
  }
  if (record.clientId !== undefined) policy.clientId = asString(record.clientId, 'oauth.clientId')
  if (record.scope !== undefined) policy.scope = asString(record.scope, 'oauth.scope')
  return policy
}

/**
 * Apply one validated patch to a stored server.
 *
 * A transport change clears the fields that belong to the other transport, so
 * the result always passes {@link validateServerConfig}. `env`/`headers`
 * maps are full replacements: a key absent from the patch is removed.
 * @param current - the server as stored.
 * @param patch - the validated patch.
 * @returns a new server; the input is not mutated.
 */
export function applyServerPatch(current: StoredServer, patch: ServerPatch): StoredServer {
  const next: StoredServer = {
    ...current,
    args: [...current.args],
    env: { ...current.env },
    headers: { ...current.headers },
    envSensitive: [...current.envSensitive],
    headerSensitive: [...current.headerSensitive],
    reconnect: { ...current.reconnect },
    ...patch.oauth === undefined ? {} : patch.oauth === null ? {} : { oauth: { ...patch.oauth } },
  }
  if (patch.oauth === null) Reflect.deleteProperty(next, 'oauth')
  if (patch.label !== undefined) next.label = patch.label
  if (patch.enabled !== undefined) next.enabled = patch.enabled
  if (patch.command !== undefined) next.command = patch.command
  if (patch.cwd !== undefined) next.cwd = patch.cwd
  if (patch.url !== undefined) next.url = patch.url
  if (patch.args !== undefined) next.args = [...patch.args]
  if (patch.env !== undefined) next.env = resolveSecrets(patch.env, current.env)
  if (patch.headers !== undefined) next.headers = resolveSecrets(patch.headers, current.headers)
  if (patch.envSensitive !== undefined) next.envSensitive = [...patch.envSensitive]
  if (patch.headerSensitive !== undefined) next.headerSensitive = [...patch.headerSensitive]
  if (patch.toolCallTimeoutMs !== undefined) next.toolCallTimeoutMs = patch.toolCallTimeoutMs
  if (patch.startupTimeoutMs !== undefined) next.startupTimeoutMs = patch.startupTimeoutMs
  if (patch.closeTimeoutMs !== undefined) next.closeTimeoutMs = patch.closeTimeoutMs
  if (patch.toolLoading !== undefined) next.toolLoading = patch.toolLoading
  if (patch.reconnect !== undefined) {
    const merged = { ...current.reconnect }
    if (patch.reconnect.enabled !== undefined) merged.enabled = patch.reconnect.enabled
    if (patch.reconnect.initialDelayMs !== undefined) merged.initialDelayMs = patch.reconnect.initialDelayMs
    if (patch.reconnect.maxDelayMs !== undefined) merged.maxDelayMs = patch.reconnect.maxDelayMs
    if (patch.reconnect.maxAttempts !== undefined) merged.maxAttempts = patch.reconnect.maxAttempts
    validateReconnect(merged)
    next.reconnect = merged
  }
  if (patch.transport !== undefined && patch.transport !== current.transport) {
    next.transport = patch.transport
    if (patch.transport === 'stdio') {
      next.url = ''
      next.headers = {}
      next.headerSensitive = []
      Reflect.deleteProperty(next, 'oauth')
    } else {
      next.command = ''
      next.args = []
      next.env = {}
      next.cwd = ''
      next.envSensitive = []
    }
  }
  if (next.oauth !== undefined && next.transport !== 'streamable-http') Reflect.deleteProperty(next, 'oauth')
  validateServerConfig(next)
  return next
}

/** Resolve a full secret map replacement against the current values. */
function resolveSecrets(patch: Readonly<Record<string, SecretInput>>, current: Readonly<Record<string, string>>): Record<string, string> {
  const next: Record<string, string> = {}
  for (const [key, entry] of Object.entries(patch)) {
    if (typeof entry === 'string') {
      next[key] = entry
      continue
    }
    if (entry.clear === true) continue
    if (entry.value !== undefined) next[key] = entry.value
    else if (current[key] !== undefined) next[key] = current[key] as string
  }
  return next
}

/**
 * Build one stored server from a fresh patch, applying defaults for absent fields.
 * @param patch - the validated patch; its `id` names the server.
 * @returns the server to write.
 */
export function serverFromPatch(patch: ServerPatch): StoredServer {
  const base = { ...defaultServer(patch.id), enabled: true }
  return applyServerPatch(base, patch)
}

/** Secret-state projection: existence, masking intent, and template kind only. */
export function secretStates(
  values: Readonly<Record<string, string>>,
  sensitive: readonly string[],
): Record<string, SecretState> {
  const masked = new Set(sensitive)
  const result: Record<string, SecretState> = {}
  for (const [key, value] of Object.entries(values)) {
    result[key] = {
      set: value !== '',
      sensitive: masked.has(key),
      template: isTemplatedValue(value),
      credential: isCredentialTemplate(value),
    }
  }
  return result
}

/** Names one server keeps as templates, for panel display. */
export function templatesOf(server: StoredServer): ServerTemplates {
  const env: string[] = []
  const headers: string[] = []
  const credentials: string[] = []
  const scan = (values: Readonly<Record<string, string>>, target: string[], prefix: 'env' | 'headers'): void => {
    for (const [key, value] of Object.entries(values)) {
      if (isTemplatedValue(value)) target.push(key)
      if (isCredentialTemplate(value)) credentials.push(`${prefix}.${key}`)
    }
  }
  scan(server.env, env, 'env')
  scan(server.headers, headers, 'headers')
  if (isCredentialTemplate(server.url)) credentials.push('url')
  if (isCredentialTemplate(server.command)) credentials.push('command')
  return { env, headers, credentials }
}

/**
 * Project one merged file server into the browser view.
 * @param sourced - the winning server plus its provenance.
 * @param registration - whether the Host registered it with the official manager.
 * @returns the redacted view.
 */
export function toServerView(
  sourced: {
    readonly id: string
    readonly scope: McpScope
    readonly path: string
    readonly writable: boolean
    readonly shadowed: readonly { readonly scope: McpScope }[]
    readonly server: StoredServer
  },
  registration: RegistrationView,
): ManagedServerView {
  const server = sourced.server
  return {
    id: sourced.id,
    label: server.label === '' ? sourced.id : server.label,
    enabled: server.enabled,
    transport: server.transport,
    command: server.command,
    args: [...server.args],
    cwd: server.cwd,
    url: server.url,
    env: secretStates(server.env, server.envSensitive),
    headers: secretStates(server.headers, server.headerSensitive),
    toolCallTimeoutMs: server.toolCallTimeoutMs,
    startupTimeoutMs: server.startupTimeoutMs,
    closeTimeoutMs: server.closeTimeoutMs,
    reconnect: { ...server.reconnect },
    toolLoading: server.toolLoading,
    ...server.oauth === undefined ? {} : { oauth: { ...server.oauth } },
    scope: sourced.scope,
    path: sourced.path,
    writable: sourced.writable,
    shadowed: sourced.shadowed.map(entry => entry.scope),
    templates: templatesOf(server),
    registration,
  }
}

/** Redact the workspace registry for the panel. */
export function toWorkspaceViews(
  workspaces: readonly { id: string; path: string; title?: string }[],
): WorkspaceView[] {
  return workspaces.map(workspace => ({
    id: String(workspace.id),
    path: workspace.path,
    title: workspace.title ?? workspace.path,
  }))
}
