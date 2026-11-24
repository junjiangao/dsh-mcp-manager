/** The editor form model: strings in, a validated patch or official entry out. */

import { describe, expect, it } from 'vitest'
import { createDraft, entryFromDraft, isEntryTarget, patchFromDraft, scopeOf, validateDraft, type ServerDraft } from '../src/client/draft.ts'
import type { ServerSummary } from '../src/client/summary.ts'

function row(overrides: Partial<ServerSummary> = {}): ServerSummary {
  return {
    name: 'demo',
    kind: 'file',
    label: 'demo',
    enabled: true,
    transport: 'stdio',
    scope: 'profile',
    path: '/p/mcp.json',
    writable: true,
    compat: false,
    shadowed: [],
    command: 'node',
    args: ['server.js'],
    cwd: '',
    url: '',
    env: [{ key: 'TOKEN', state: { set: true, sensitive: true, template: false, credential: false } }],
    headers: [],
    toolCallTimeoutMs: 60_000,
    startupTimeoutMs: 30_000,
    closeTimeoutMs: 5_000,
    reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 },
    toolLoading: 'eager',
    tools: [],
    disabledTools: [],
    conflict: false,
    ...overrides,
  }
}

function draftOf(overrides: Partial<ServerDraft>): ServerDraft {
  return { ...createDraft(undefined, 'profile'), name: 'demo', command: 'node', ...overrides }
}

describe('drafts', () => {
  it('starts from a file row, masking stored secrets', () => {
    const draft = createDraft(row())
    expect(draft.target).toBe('profile')
    expect(draft.env[0]).toEqual({ key: 'TOKEN', value: '', secret: true, configured: true })
    expect(draft.toolCallTimeoutMs).toBe('60000')
  })

  it('starts from an official entry row and keeps its OAuth policy', () => {
    const draft = createDraft(row({
      kind: 'entry', scope: undefined, oauth: { credentialKey: 'mcp-client/demo', requestTimeoutMs: 1, authorizationTimeoutMs: 2 },
      transport: 'streamable-http', command: '', args: [], url: 'https://x.test/mcp',
    }))
    expect(draft.target).toBe('entry')
    expect(draft.oauthEnabled).toBe(true)
    expect(draft.oauthCredentialKey).toBe('mcp-client/demo')
  })
})

describe('validation', () => {
  it('reports each invalid field once', () => {
    expect(validateDraft(draftOf({ name: 'bad id' }))).toContain('name')
    expect(validateDraft(draftOf({ command: '  ' }))).toContain('command')
    expect(validateDraft(draftOf({ transport: 'streamable-http', url: 'ftp://x' }))).toContain('url')
    expect(validateDraft(draftOf({ toolCallTimeoutMs: '0' }))).toContain('timeout')
    expect(validateDraft(draftOf({ env: [{ key: '', value: 'x', secret: false, configured: false }] }))).toContain('envKey')
    expect(validateDraft(draftOf({ oauthEnabled: true, oauthCredentialKey: 'nope', transport: 'streamable-http', url: 'https://x', command: '' }))).toContain('oauthKey')
    expect(validateDraft(draftOf({ reconnectEnabled: true, reconnectInitial: '900', reconnectMax: '100' }))).toContain('reconnect')
  })

  it('accepts a complete draft', () => {
    expect(validateDraft(draftOf({}))).toEqual([])
  })
})

describe('projections', () => {
  it('maps targets and scopes', () => {
    expect(scopeOf('entry')).toBe('profile')
    expect(scopeOf('project')).toBe('project')
    expect(isEntryTarget('entry')).toBe(true)
    expect(isEntryTarget('user')).toBe(false)
  })

  it('keeps a masked secret and writes the sensitive key list', () => {
    const patch = patchFromDraft(draftOf({
      env: [{ key: 'TOKEN', value: '', secret: true, configured: true }, { key: 'A', value: '1', secret: false, configured: false }],
    }))
    expect(patch.env).toEqual({ TOKEN: {}, A: '1' })
    expect(patch.envSensitive).toEqual(['TOKEN'])
    expect(patch.transport).toBe('stdio')
    expect(patch.oauth).toBeUndefined()
  })

  it('writes URL, headers, and OAuth for an http target', () => {
    const patch = patchFromDraft(draftOf({
      transport: 'streamable-http', url: 'https://x.test/mcp', command: '',
      headers: [{ key: 'Authorization', value: 'Bearer t', secret: true, configured: false }],
      oauthEnabled: true, oauthCredentialKey: 'mcp-client/demo',
    }))
    expect(patch.url).toBe('https://x.test/mcp')
    expect(patch.headers).toEqual({ Authorization: 'Bearer t' })
    expect(patch.headerSensitive).toEqual(['Authorization'])
    expect(patch.oauth).toMatchObject({ credentialKey: 'mcp-client/demo' })
  })

  it('builds a complete official entry without the other transport fields', () => {
    const stdio = entryFromDraft(draftOf({ cwd: '/work', command: 'node', args: ['server.js'] }))
    expect(stdio).toMatchObject({ transport: 'stdio', command: 'node', args: ['server.js'], cwd: '/work' })
    expect(stdio.url).toBeUndefined()
    const http = entryFromDraft(draftOf({
      transport: 'streamable-http', command: '', url: 'https://x.test/mcp',
      oauthEnabled: true, oauthCredentialKey: 'mcp-client/demo',
    }))
    expect(http.command).toBeUndefined()
    expect(http.env).toBeUndefined()
    expect(http.oauth).toMatchObject({ credentialKey: 'mcp-client/demo' })
  })
})
