/** The shared validator: the same rules a file entry and a panel write must pass. */

import { describe, expect, it } from 'vitest'
import {
  CREDENTIAL_KEY_PATTERN, DEFAULT_RECONNECT, defaultServer, isCredentialTemplate, isTemplatedValue, validateReconnect, validateServerConfig,
  validateServerId,
} from '../src/server-config.ts'

describe('server ids', () => {
  it('accepts the mcp-client namespace alphabet and bounds', () => {
    expect(() => validateServerId('demo')).not.toThrow()
    expect(() => validateServerId('a-b_c1')).not.toThrow()
    expect(() => validateServerId('')).toThrow(/must match/u)
    expect(() => validateServerId('a'.repeat(33))).toThrow(/must match/u)
    expect(() => validateServerId('bad id')).toThrow(/must match/u)
  })
})

describe('server configuration', () => {
  it('fills the official defaults', () => {
    const server = defaultServer('demo')
    expect(server.enabled).toBe(true)
    expect(server.startupTimeoutMs).toBe(30_000)
    expect(server.closeTimeoutMs).toBe(5_000)
    expect(server.toolCallTimeoutMs).toBe(60_000)
    expect(server.toolLoading).toBe('eager')
    expect(server.reconnect).toEqual(DEFAULT_RECONNECT)
  })

  it('requires the fields each transport needs and forbids the other transport', () => {
    expect(() => validateServerConfig({ ...defaultServer('a'), transport: 'stdio', command: '' })).toThrow(/needs a command/u)
    expect(() => validateServerConfig({ ...defaultServer('a'), transport: 'streamable-http', url: '' })).toThrow(/needs a URL/u)
    expect(() => validateServerConfig({ ...defaultServer('a'), transport: 'streamable-http', url: 'ftp://x' })).toThrow(/http or https/u)
    expect(() => validateServerConfig({ ...defaultServer('a'), transport: 'streamable-http', url: 'https://x', command: 'node' })).toThrow(/must not set a command/u)
    expect(() => validateServerConfig({ ...defaultServer('a'), command: 'node', env: { '': 'x' } })).toThrow(/empty environment key/u)
  })

  it('validates every timeout bound and reconnect ordering', () => {
    const base = { ...defaultServer('a'), command: 'node' }
    expect(() => validateServerConfig({ ...base, toolCallTimeoutMs: 0 })).toThrow(/must be .*integer/u)
    expect(() => validateServerConfig({ ...base, startupTimeoutMs: 2_147_483_648 })).toThrow(/must be .*integer/u)
    expect(() => validateReconnect({ ...DEFAULT_RECONNECT, initialDelayMs: 2_000, maxDelayMs: 1_000 })).toThrow(/must be >= initialDelayMs/u)
    expect(() => validateReconnect({ ...DEFAULT_RECONNECT, maxAttempts: 0 })).toThrow(/must be .*integer/u)
  })

  it('accepts credential templates only as the whole value and only with the namespace', () => {
    expect(isCredentialTemplate('${credential:mcp-client/demo}')).toBe(true)
    expect(isCredentialTemplate('Bearer ${credential:mcp-client/demo}')).toBe(true)
    expect(isTemplatedValue('${env:TOKEN}')).toBe(true)
    expect(CREDENTIAL_KEY_PATTERN.test('mcp-client/demo')).toBe(true)
    expect(CREDENTIAL_KEY_PATTERN.test('mcp-client/a/b')).toBe(false)
    const base = { ...defaultServer('a'), transport: 'streamable-http' as const, url: 'https://x' }
    expect(() => validateServerConfig({ ...base, headers: { Authorization: 'Bearer ${credential:mcp-client/demo}' } })).toThrow(/credential/u)
    expect(() => validateServerConfig({ ...base, oauth: { credentialKey: 'nope', requestTimeoutMs: 1, authorizationTimeoutMs: 2 } })).toThrow(/mcp-client/u)
    expect(() => validateServerConfig({ ...defaultServer('a'), command: 'node', oauth: { credentialKey: 'mcp-client/a', requestTimeoutMs: 1, authorizationTimeoutMs: 2 } })).toThrow(/streamable-http/u)
  })

  it('accepts an orphan sensitive marker, because the official client allows it', () => {
    expect(() => validateServerConfig({ ...defaultServer('a'), command: 'node', envSensitive: ['GONE'] })).not.toThrow()
  })
})
