/** The editor's form model: strings in, a validated patch or entry out. */

import {
  CREDENTIAL_KEY_PATTERN, DEFAULT_CLOSE_TIMEOUT_MS, DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS, DEFAULT_OAUTH_REQUEST_TIMEOUT_MS,
  DEFAULT_RECONNECT, DEFAULT_STARTUP_TIMEOUT_MS, DEFAULT_TOOL_CALL_TIMEOUT_MS, MAX_TIMER_DELAY_MS, isCredentialTemplate,
} from '../server-config.ts'
import type { McpScope, OAuthPolicy, ReconnectPolicy, SecretInput, ServerPatch, ServerTransport, ToolLoading } from '../types.ts'
import type { EntryServer, MapRow, ServerSummary } from './summary.ts'

export type DraftTarget = 'entry' | McpScope

export interface DraftRow {
  key: string
  value: string
  /** Store the value as sensitive (file targets only). */
  secret: boolean
  /** A value exists on disk but the browser only sees its masked projection. */
  configured: boolean
}

export interface ServerDraft {
  target: DraftTarget
  name: string
  enabled: boolean
  transport: ServerTransport
  command: string
  args: string[]
  cwd: string
  url: string
  env: DraftRow[]
  headers: DraftRow[]
  toolCallTimeoutMs: string
  startupTimeoutMs: string
  closeTimeoutMs: string
  reconnectEnabled: boolean
  reconnectInitial: string
  reconnectMax: string
  reconnectAttempts: string
  toolLoading: ToolLoading
  oauthEnabled: boolean
  oauthCredentialKey: string
  oauthClientId: string
  oauthScope: string
  oauthRequestTimeout: string
  oauthAuthorizationTimeout: string
}

export type DraftIssue = 'name' | 'command' | 'url' | 'timeout' | 'envKey' | 'credential' | 'oauthKey' | 'reconnect'

const SERVER_ID_RE = /^[-A-Za-z0-9_]{1,32}$/u

/**
 * Build an editing draft.
 * @param row - the server to edit, or `undefined` for a new one.
 * @param defaultTarget - where a new server is written when the official form is unavailable.
 * @returns the draft.
 */
export function createDraft(row: ServerSummary | undefined, defaultTarget: DraftTarget = 'entry'): ServerDraft {
  if (row === undefined) {
    return {
      target: defaultTarget,
      name: '',
      enabled: true,
      transport: 'stdio',
      command: '',
      args: [],
      cwd: '',
      url: '',
      env: [],
      headers: [],
      toolCallTimeoutMs: String(DEFAULT_TOOL_CALL_TIMEOUT_MS),
      startupTimeoutMs: String(DEFAULT_STARTUP_TIMEOUT_MS),
      closeTimeoutMs: String(DEFAULT_CLOSE_TIMEOUT_MS),
      reconnectEnabled: DEFAULT_RECONNECT.enabled,
      reconnectInitial: String(DEFAULT_RECONNECT.initialDelayMs),
      reconnectMax: String(DEFAULT_RECONNECT.maxDelayMs),
      reconnectAttempts: String(DEFAULT_RECONNECT.maxAttempts),
      toolLoading: 'eager',
      oauthEnabled: false,
      oauthCredentialKey: '',
      oauthClientId: '',
      oauthScope: '',
      oauthRequestTimeout: String(DEFAULT_OAUTH_REQUEST_TIMEOUT_MS),
      oauthAuthorizationTimeout: String(DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS),
    }
  }
  return {
    target: row.kind === 'entry' ? 'entry' : row.scope ?? 'profile',
    name: row.name,
    enabled: row.enabled,
    transport: row.transport,
    command: row.command,
    args: [...row.args],
    cwd: row.cwd,
    url: row.url,
    env: draftRows(row.env),
    headers: draftRows(row.headers),
    toolCallTimeoutMs: String(row.toolCallTimeoutMs),
    startupTimeoutMs: String(row.startupTimeoutMs),
    closeTimeoutMs: String(row.closeTimeoutMs),
    reconnectEnabled: row.reconnect.enabled,
    reconnectInitial: String(row.reconnect.initialDelayMs),
    reconnectMax: String(row.reconnect.maxDelayMs),
    reconnectAttempts: String(row.reconnect.maxAttempts),
    toolLoading: row.toolLoading,
    oauthEnabled: row.oauth !== undefined,
    oauthCredentialKey: row.oauth?.credentialKey ?? '',
    oauthClientId: row.oauth?.clientId ?? '',
    oauthScope: row.oauth?.scope ?? '',
    oauthRequestTimeout: String(row.oauth?.requestTimeoutMs ?? DEFAULT_OAUTH_REQUEST_TIMEOUT_MS),
    oauthAuthorizationTimeout: String(row.oauth?.authorizationTimeoutMs ?? DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS),
  }
}

function draftRows(rows: readonly MapRow[]): DraftRow[] {
  return rows.map(row => ({
    key: row.key,
    value: row.state === undefined ? row.value ?? '' : '',
    secret: row.state?.sensitive ?? false,
    configured: row.state?.set ?? false,
  }))
}

/** Field-level issues in display order; empty means the draft is writable. */
export function validateDraft(draft: ServerDraft): DraftIssue[] {
  const issues: DraftIssue[] = []
  if (!SERVER_ID_RE.test(draft.name)) issues.push('name')
  if (draft.transport === 'stdio' && draft.command.trim() === '') issues.push('command')
  if (draft.transport === 'streamable-http' && !/^https?:\/\/[^\s]+$/u.test(draft.url.trim())) issues.push('url')
  for (const value of [draft.toolCallTimeoutMs, draft.startupTimeoutMs, draft.closeTimeoutMs]) {
    if (!validTimeout(value)) issues.push('timeout')
  }
  if (draft.reconnectEnabled) {
    for (const value of [draft.reconnectInitial, draft.reconnectMax, draft.reconnectAttempts]) {
      if (!validTimeout(value)) issues.push('timeout')
    }
    const initial = Number(draft.reconnectInitial)
    const max = Number(draft.reconnectMax)
    if (Number.isFinite(initial) && Number.isFinite(max) && initial > max) issues.push('reconnect')
  }
  for (const row of [...draft.env, ...draft.headers]) {
    if (row.key.trim() === '') issues.push('envKey')
  }
  if (draft.oauthEnabled) {
    if (!CREDENTIAL_KEY_PATTERN.test(draft.oauthCredentialKey)) issues.push('oauthKey')
    if (!validTimeout(draft.oauthRequestTimeout) || !validTimeout(draft.oauthAuthorizationTimeout)) issues.push('timeout')
  }
  for (const row of [...draft.env, ...draft.headers]) {
    if (row.value !== '' && row.value.trim() !== row.value && isCredentialTemplate(row.value)) issues.push('credential')
  }
  return [...new Set(issues)]
}

function validTimeout(value: string): boolean {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= MAX_TIMER_DELAY_MS
}

/** Whether the target writes to the official manager's entry form. */
export function isEntryTarget(target: DraftTarget): target is 'entry' {
  return target === 'entry'
}

/** The scope a file target writes to. */
export function scopeOf(target: DraftTarget): McpScope {
  return target === 'entry' ? 'profile' : target
}

/**
 * Build the RPC patch for a file target.
 * @param draft - a draft that passed {@link validateDraft}.
 * @returns the patch, with masked secrets marked keep and untouched rows omitted.
 */
export function patchFromDraft(draft: ServerDraft): ServerPatch {
  const patch: { -readonly [K in keyof ServerPatch]: ServerPatch[K] } = {
    id: draft.name,
    transport: draft.transport,
    enabled: draft.enabled,
    args: [...draft.args],
    toolCallTimeoutMs: Number(draft.toolCallTimeoutMs),
    startupTimeoutMs: Number(draft.startupTimeoutMs),
    closeTimeoutMs: Number(draft.closeTimeoutMs),
    reconnect: reconnectOf(draft),
    toolLoading: draft.toolLoading,
  }
  if (draft.transport === 'stdio') {
    patch.command = draft.command
    patch.cwd = draft.cwd
    patch.env = secretMap(draft.env)
    patch.envSensitive = draft.env.filter(row => row.secret && row.key.trim() !== '').map(row => row.key)
  } else {
    patch.url = draft.url
    patch.headers = secretMap(draft.headers)
    patch.headerSensitive = draft.headers.filter(row => row.secret && row.key.trim() !== '').map(row => row.key)
    patch.oauth = oauthOf(draft)
  }
  return patch
}

/**
 * Build a complete official manager entry for an entry target.
 * @param draft - a draft that passed {@link validateDraft}.
 * @returns the entry; transport-specific fields of the other transport are absent.
 */
export function entryFromDraft(draft: ServerDraft): EntryServer {
  const entry: EntryServer = {
    transport: draft.transport,
    enabled: draft.enabled,
    toolCallTimeoutMs: Number(draft.toolCallTimeoutMs),
    startupTimeoutMs: Number(draft.startupTimeoutMs),
    closeTimeoutMs: Number(draft.closeTimeoutMs),
    reconnect: reconnectOf(draft),
    toolLoading: draft.toolLoading,
  }
  if (draft.transport === 'stdio') {
    entry.command = draft.command
    entry.args = [...draft.args]
    if (draft.cwd.trim() !== '') entry.cwd = draft.cwd
    const env = plainMap(draft.env)
    if (Object.keys(env).length > 0) entry.env = env
  } else {
    entry.url = draft.url
    const headers = plainMap(draft.headers)
    if (Object.keys(headers).length > 0) entry.headers = headers
    const oauth = oauthOf(draft)
    if (oauth !== null && oauth !== undefined) entry.oauth = oauth
  }
  return entry
}

function reconnectOf(draft: ServerDraft): ReconnectPolicy {
  return {
    enabled: draft.reconnectEnabled,
    initialDelayMs: Number(draft.reconnectInitial),
    maxDelayMs: Number(draft.reconnectMax),
    maxAttempts: Number(draft.reconnectAttempts),
  }
}

function oauthOf(draft: ServerDraft): OAuthPolicy | null {
  if (!draft.oauthEnabled || draft.transport !== 'streamable-http') return null
  const policy: OAuthPolicy = {
    credentialKey: draft.oauthCredentialKey,
    requestTimeoutMs: Number(draft.oauthRequestTimeout),
    authorizationTimeoutMs: Number(draft.oauthAuthorizationTimeout),
  }
  if (draft.oauthClientId.trim() !== '') policy.clientId = draft.oauthClientId
  if (draft.oauthScope.trim() !== '') policy.scope = draft.oauthScope
  return policy
}

function secretMap(rows: readonly DraftRow[]): Record<string, SecretInput> {
  const map: Record<string, SecretInput> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key === '') continue
    if (row.configured && row.value === '') {
      // The masked value is unchanged: `{}` keeps it server-side.
      map[key] = {}
      continue
    }
    map[key] = row.value
  }
  return map
}

function plainMap(rows: readonly DraftRow[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key !== '') map[key] = row.value
  }
  return map
}

/** Seed a row from an existing map row, keeping its stored markers. */
export function rowFromMap(row: MapRow): DraftRow {
  return {
    key: row.key,
    value: row.state === undefined ? row.value ?? '' : '',
    secret: row.state?.sensitive ?? false,
    configured: row.state?.set ?? false,
  }
}

/** The locale key explaining one issue. */
export function issueKey(issue: DraftIssue): string {
  switch (issue) {
    case 'name': return 'editor.invalid.name'
    case 'command': return 'editor.invalid.command'
    case 'url': return 'editor.invalid.url'
    case 'timeout': return 'editor.invalid.timeout'
    case 'envKey': return 'editor.invalid.envKey'
    case 'credential': return 'editor.invalid.credential'
    case 'oauthKey': return 'editor.invalid.credential'
    case 'reconnect': return 'editor.invalid.timeout'
  }
}
