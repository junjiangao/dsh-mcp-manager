/**
 * Server defaults and shape validation shared by the Host, the browser panel,
 * and the `mcp.json` codec.
 *
 * The official `@deepseek-ai/dsh-mcp-client` validates the final connection
 * configuration again (and the manager's registration path runs that
 * validation); this module covers the fields the panel edits before a write,
 * so a bad entry is rejected at the editor instead of surfacing as a failed
 * registration. It imports nothing at runtime, so the client bundle can use it.
 */

import type { OAuthPolicy, ReconnectPolicy, ServerTransport, StoredServer, ToolLoading } from './types.ts'

/**
 * Largest delay Node schedules without clamping it to one millisecond.
 *
 * Same value as `@deepseek-ai/dsh-timeout`'s `MAX_TIMER_DELAY_MS`, inlined so
 * this plugin does not carry a peer dependency for one constant.
 */
export const MAX_TIMER_DELAY_MS = 2_147_483_647

export const DEFAULT_TOOL_CALL_TIMEOUT_MS = 60_000
/** The official manager's `startupTimeoutMs` default. */
export const DEFAULT_STARTUP_TIMEOUT_MS = 30_000
/** The official client's `closeTimeoutMs` default. */
export const DEFAULT_CLOSE_TIMEOUT_MS = 5_000
export const DEFAULT_OAUTH_REQUEST_TIMEOUT_MS = 10_000
export const DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS = 600_000

/** `mcp-client` reconnect defaults, kept equal to the official `RECONNECT_DEFAULTS`. */
export const DEFAULT_RECONNECT: ReconnectPolicy = Object.freeze({
  enabled: true,
  initialDelayMs: 500,
  maxDelayMs: 30_000,
  maxAttempts: 10,
})

/** `serverName` grammar in `mcp.json` and in the official manager; also the tool namespace. */
export const SERVER_ID_PATTERN = '[-A-Za-z0-9_]{1,32}'

/** The `mcp-client` credential scope the manager requires for OAuth entries. */
export const CREDENTIAL_KEY_PATTERN = /^mcp-client\/[^/\s]+$/u

/** `${env:NAME}` / `${NAME}` / `${NAME:-fallback}`, matching `./host/interpolate.ts`. */
const TEMPLATE_PATTERN = /\$\{(?:env:)?[A-Za-z_][A-Za-z0-9_]*(?::-[^}]*)?\}/u
/** One `${credential:REF}` token; the whole value must be the token when present. */
const CREDENTIAL_TEMPLATE_PATTERN = /\$\{credential:[^}]+\}/u
const CREDENTIAL_TEMPLATE_EXACT = /^\$\{credential:[A-Za-z_][A-Za-z0-9_]*\}$/u

/** Whether a stored value is still an unresolved environment template. */
export function isTemplatedValue(value: string): boolean {
  return TEMPLATE_PATTERN.test(value)
}

/** Whether a stored value references the official credential store. */
export function isCredentialTemplate(value: string): boolean {
  return CREDENTIAL_TEMPLATE_PATTERN.test(value)
}

export function defaultServer(id: string): StoredServer {
  return {
    id,
    label: '',
    enabled: true,
    transport: 'stdio',
    command: '',
    args: [],
    cwd: '',
    url: '',
    env: {},
    headers: {},
    envSensitive: [],
    headerSensitive: [],
    toolCallTimeoutMs: DEFAULT_TOOL_CALL_TIMEOUT_MS,
    startupTimeoutMs: DEFAULT_STARTUP_TIMEOUT_MS,
    closeTimeoutMs: DEFAULT_CLOSE_TIMEOUT_MS,
    reconnect: { ...DEFAULT_RECONNECT },
    toolLoading: 'eager',
  }
}

export function validateServerId(id: string): void {
  // The dash is escaped/leading so the character class never forms a
  // descending range: browsers compile `pattern` attributes with the
  // UnicodeSets (v) flag, where `[A-Za-z0-9_-]` is a SyntaxError.
  if (!/^[-A-Za-z0-9_]{1,32}$/.test(id)) {
    throw new TypeError('server id must match [-A-Za-z0-9_]{1,32}')
  }
}

export function transportOf(value: string): ServerTransport {
  if (value === 'stdio' || value === 'streamable-http') return value
  throw new Error(`unsupported MCP transport ${JSON.stringify(value)}`)
}

/** Validate one complete stored server.
 * @param server - the entry to validate.
 * @throws TypeError for a malformed shape, Error for a rejected value.
 */
export function validateServerConfig(server: StoredServer): void {
  validateServerId(server.id)
  if (server.label.length > 120) throw new Error('server label must be at most 120 characters')
  if (server.transport === 'stdio') {
    if (server.command.trim() === '') throw new Error(`stdio server ${JSON.stringify(server.id)} needs a command`)
    if (server.url !== '') throw new Error(`stdio server ${JSON.stringify(server.id)} must not set a URL`)
    if (Object.keys(server.headers).length > 0) throw new Error(`stdio server ${JSON.stringify(server.id)} must not set headers`)
  } else {
    if (server.url.trim() === '') throw new Error(`streamable-http server ${JSON.stringify(server.id)} needs a URL`)
    if (server.command !== '') throw new Error(`streamable-http server ${JSON.stringify(server.id)} must not set a command`)
    if (server.args.length > 0) throw new Error(`streamable-http server ${JSON.stringify(server.id)} must not set args`)
    if (Object.keys(server.env).length > 0) throw new Error(`streamable-http server ${JSON.stringify(server.id)} must not set env`)
    if (server.cwd !== '') throw new Error(`streamable-http server ${JSON.stringify(server.id)} must not set cwd`)
    // A template is resolved by the Host (environment) or the official client
    // (credentials) before connecting, so the final URL is parsed there. A
    // literal URL is validated here for an early, actionable error.
    if (!isTemplatedValue(server.url) && !isCredentialTemplate(server.url)) {
      let url: URL
      try { url = new URL(server.url) } catch { throw new Error(`streamable-http server ${JSON.stringify(server.id)} has an invalid URL`) }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`streamable-http server ${JSON.stringify(server.id)} URL must use http or https`)
      }
    }
  }
  validateTimeout(server.toolCallTimeoutMs, 'toolCallTimeoutMs', server.id)
  validateTimeout(server.startupTimeoutMs, 'startupTimeoutMs', server.id)
  validateTimeout(server.closeTimeoutMs, 'closeTimeoutMs', server.id)
  validateReconnect(server.reconnect)
  if (server.toolLoading !== 'eager' && server.toolLoading !== 'on-demand') {
    throw new Error(`server ${JSON.stringify(server.id)} toolLoading must be "eager" or "on-demand"`)
  }
  for (const [key, value] of Object.entries(server.env)) {
    if (key.trim() === '') throw new Error(`server ${JSON.stringify(server.id)} contains an empty environment key`)
    if (typeof value !== 'string') throw new Error(`server ${JSON.stringify(server.id)} environment values must be strings`)
    validateCredentialValue(server.id, `env.${key}`, value)
  }
  for (const [key, value] of Object.entries(server.headers)) {
    if (key.trim() === '') throw new Error(`server ${JSON.stringify(server.id)} contains an empty header key`)
    if (typeof value !== 'string') throw new Error(`server ${JSON.stringify(server.id)} header values must be strings`)
    validateCredentialValue(server.id, `headers.${key}`, value)
  }
  validateSensitiveKeys(server.id, 'envSensitive', server.envSensitive)
  validateSensitiveKeys(server.id, 'headerSensitive', server.headerSensitive)
  if (server.oauth !== undefined) validateOAuthPolicy(server.id, server.transport, server.oauth)
}

/** Validate one OAuth policy for a server.
 * @param id - server name, for messages.
 * @param transport - the server transport; OAuth requires `streamable-http`.
 * @param oauth - the policy to validate.
 */
export function validateOAuthPolicy(id: string, transport: ServerTransport, oauth: OAuthPolicy): void {
  if (transport !== 'streamable-http') throw new Error(`server ${JSON.stringify(id)}: OAuth requires the streamable-http transport`)
  if (!CREDENTIAL_KEY_PATTERN.test(oauth.credentialKey)) {
    throw new Error(`server ${JSON.stringify(id)} oauth.credentialKey must look like "mcp-client/<id>"`)
  }
  if (oauth.clientId !== undefined && oauth.clientId.trim() === '') throw new Error(`server ${JSON.stringify(id)} oauth.clientId must not be blank`)
  if (oauth.scope !== undefined && typeof oauth.scope !== 'string') throw new Error(`server ${JSON.stringify(id)} oauth.scope must be a string`)
  validateTimeout(oauth.requestTimeoutMs, 'oauth.requestTimeoutMs', id)
  validateTimeout(oauth.authorizationTimeoutMs, 'oauth.authorizationTimeoutMs', id)
}

export function validateReconnect(value: ReconnectPolicy): void {
  if (!Number.isSafeInteger(value.initialDelayMs) || value.initialDelayMs < 1 || value.initialDelayMs > MAX_TIMER_DELAY_MS) {
    throw new Error(`reconnect.initialDelayMs must be an integer from 1 to ${String(MAX_TIMER_DELAY_MS)}`)
  }
  if (!Number.isSafeInteger(value.maxDelayMs) || value.maxDelayMs < value.initialDelayMs || value.maxDelayMs > MAX_TIMER_DELAY_MS) {
    throw new Error(`reconnect.maxDelayMs must be >= initialDelayMs and at most ${String(MAX_TIMER_DELAY_MS)}`)
  }
  if (!Number.isSafeInteger(value.maxAttempts) || value.maxAttempts < 1) throw new Error('reconnect.maxAttempts must be a positive integer')
  if (typeof value.enabled !== 'boolean') throw new Error('reconnect.enabled must be a boolean')
}

export function isToolLoading(value: unknown): value is ToolLoading {
  return value === 'eager' || value === 'on-demand'
}

function validateTimeout(value: number, field: string, serverId: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_TIMER_DELAY_MS) {
    throw new Error(`server ${JSON.stringify(serverId)} ${field} must be an integer from 1 to ${String(MAX_TIMER_DELAY_MS)}`)
  }
}

function validateCredentialValue(serverId: string, field: string, value: string): void {
  if (!CREDENTIAL_TEMPLATE_PATTERN.test(value)) return
  if (!CREDENTIAL_TEMPLATE_EXACT.test(value)) {
    throw new Error(`server ${JSON.stringify(serverId)} ${field}: a credential reference must be the whole value ("\${credential:REF}")`)
  }
}

function validateSensitiveKeys(serverId: string, field: 'envSensitive' | 'headerSensitive', keys: readonly string[]): void {
  const seen = new Set<string>()
  for (const key of keys) {
    if (key.trim() === '' || key.length > 256) throw new Error(`server ${JSON.stringify(serverId)} contains an invalid ${field} key`)
    if (seen.has(key)) throw new Error(`server ${JSON.stringify(serverId)} ${field} contains duplicate key ${JSON.stringify(key)}`)
    seen.add(key)
  }
}
