/**
 * Pure `mcp.json` behaviour: the shared file format, the fields the official
 * manager needs, template expansion, and the precedence merge over scopes.
 */

import { describe, expect, it } from 'vitest'
import { expandMap, expandTemplate, isTemplate, templateEnvNames, templateEnvNamesOf } from '../src/host/interpolate.ts'
import {
  MCP_SERVERS_ALIAS_KEY, MCP_SERVERS_KEY, emptyDocument, normalizeServer, parseMcpJson, serializeMcpJson, transportOfJson, withServer,
} from '../src/host/mcp-json.ts'
import { expandServer, mergeSources } from '../src/host/mcp-sources.ts'
import type { ReadResult } from '../src/host/mcp-file.ts'
import { defaultServer } from '../src/server-config.ts'
import type { McpScope, StoredServer } from '../src/types.ts'

function scopeRow(scope: McpScope, path: string, servers: Record<string, unknown>, extra: Partial<ReadResult> = {}): ReadResult {
  return {
    scope,
    path,
    writable: !path.endsWith('.mcp.json'),
    compat: path.endsWith('.mcp.json'),
    exists: true,
    document: { serversKey: MCP_SERVERS_KEY, root: {}, servers },
    ...extra,
  }
}

describe('template expansion', () => {
  it('expands every accepted spelling and keeps escapes literal', () => {
    const env = { TOKEN: 'secret', EMPTY: '' }
    expect(expandTemplate('${env:TOKEN}', env)).toEqual({ value: 'secret', missing: [] })
    expect(expandTemplate('${TOKEN}', env)).toEqual({ value: 'secret', missing: [] })
    expect(expandTemplate('Bearer ${env:TOKEN}', env)).toEqual({ value: 'Bearer secret', missing: [] })
    expect(expandTemplate('${MISSING:-fallback}', env)).toEqual({ value: 'fallback', missing: [] })
    expect(expandTemplate('${EMPTY:-fallback}', env)).toEqual({ value: 'fallback', missing: [] })
    expect(expandTemplate('$${TOKEN}', env)).toEqual({ value: '${TOKEN}', missing: [] })
  })

  it('reports unresolved names instead of substituting them', () => {
    expect(expandTemplate('${A}/x/${B}', { B: 'b' }).missing).toEqual(['A'])
    expect(templateEnvNames('${A}-${A}-${B}')).toEqual(['A', 'B'])
    expect(isTemplate('plain')).toBe(false)
    expect(templateEnvNamesOf({ A: '${X}', B: 'plain', C: '${Y}' })).toEqual(['X', 'Y'])
    expect(expandMap({ A: '${X}' }, {})).toEqual({ values: { A: '${X}' }, missing: ['X'] })
  })

  it('never treats a credential reference as an environment variable', () => {
    expect(expandTemplate('${credential:mcp-client/example}', {})).toEqual({
      value: '${credential:mcp-client/example}', missing: [],
    })
  })
})

describe('mcp.json documents', () => {
  it('reads the ecosystem format and the VS Code alias', () => {
    const primary = parseMcpJson(JSON.stringify({ mcpServers: { a: { command: 'node' } } }))
    expect(primary.ok).toBe(true)
    if (primary.ok) {
      expect(primary.document.serversKey).toBe(MCP_SERVERS_KEY)
      expect(Object.keys(primary.document.servers)).toEqual(['a'])
    }
    const alias = parseMcpJson(JSON.stringify({ servers: { a: { command: 'node' } }, inputs: [] }))
    expect(alias.ok).toBe(true)
    if (alias.ok) {
      expect(alias.document.serversKey).toBe(MCP_SERVERS_ALIAS_KEY)
      expect(serializeMcpJson(alias.document)).toBe(JSON.stringify({
        inputs: [], servers: { a: { command: 'node' } },
      }, null, 2) + '\n')
    }
  })

  it('reports malformed JSON and a non-object root as errors, not throws', () => {
    expect(parseMcpJson('{not json').ok).toBe(false)
    expect(parseMcpJson('[]')).toEqual({ ok: false, error: 'the document root must be a JSON object' })
  })

  it('writes only the fields that differ from the defaults', () => {
    const server: StoredServer = { ...defaultServer('a'), command: 'node', env: { T: '1' }, envSensitive: ['T'] }
    const document = withServer(emptyDocument(), 'a', server)
    expect(document.servers.a).toEqual({
      type: 'stdio', command: 'node', args: [], env: { T: '1' }, sensitive: { env: ['T'] },
    })
  })

  it('round-trips the manager-only fields and drops them again when reset', () => {
    const server: StoredServer = {
      ...defaultServer('a'),
      transport: 'streamable-http',
      url: 'https://example.test/mcp',
      startupTimeoutMs: 12_000,
      closeTimeoutMs: 3_000,
      toolLoading: 'on-demand',
      oauth: { credentialKey: 'mcp-client/a', requestTimeoutMs: 10_000, authorizationTimeoutMs: 600_000 },
    }
    const document = withServer(emptyDocument(), 'a', server)
    expect(document.servers.a).toEqual({
      type: 'http',
      url: 'https://example.test/mcp',
      startupTimeoutMs: 12_000,
      closeTimeoutMs: 3_000,
      toolLoading: 'on-demand',
      oauth: { credentialKey: 'mcp-client/a', requestTimeoutMs: 10_000, authorizationTimeoutMs: 600_000 },
    })
    const normalized = normalizeServer('a', document.servers.a)
    expect(normalized.ok).toBe(true)
    if (normalized.ok) {
      expect(normalized.server.startupTimeoutMs).toBe(12_000)
      expect(normalized.server.closeTimeoutMs).toBe(3_000)
      expect(normalized.server.toolLoading).toBe('on-demand')
      expect(normalized.server.oauth?.credentialKey).toBe('mcp-client/a')
    }
  })

  it('infers the transport from a URL and rejects cross-transport fields', () => {
    expect(transportOfJson(undefined, true)).toBe('streamable-http')
    expect(transportOfJson('http', true)).toBe('streamable-http')
    expect(transportOfJson('sse', true)).toBeUndefined()
    expect(normalizeServer('a', { command: 'node', url: 'https://x.test' }).ok).toBe(false)
    const unsupported = normalizeServer('a', { type: 'sse', url: 'https://x.test' })
    expect(unsupported.ok).toBe(false)
    if (!unsupported.ok) expect(unsupported.error).toMatch(/unsupported transport "sse"/u)
  })

  it('keeps OAuth only on streamable-http and validates its credential key', () => {
    expect(normalizeServer('a', { command: 'node', oauth: { credentialKey: 'mcp-client/a' } }).ok).toBe(false)
    expect(normalizeServer('a', { url: 'https://x.test', oauth: { credentialKey: 'nope' } }).ok).toBe(false)
    const normalized = normalizeServer('a', { url: 'https://x.test', oauth: { credentialKey: 'mcp-client/a' } })
    expect(normalized.ok).toBe(true)
    if (normalized.ok) {
      expect(normalized.server.oauth).toEqual({ credentialKey: 'mcp-client/a', requestTimeoutMs: 10_000, authorizationTimeoutMs: 600_000 })
    }
  })
})

describe('scope precedence', () => {
  it('keeps the highest-precedence definition and records the shadowed scopes', () => {
    const merged = mergeSources({
      scopes: [
        scopeRow('project', '/p/.dsh/mcp.json', { shared: { command: 'project' } }),
        scopeRow('project', '/p/.mcp.json', { shared: { command: 'compat' }, onlyCompat: { command: 'node' } }),
        scopeRow('profile', '/home/profiles/x/mcp.json', { shared: { command: 'profile' } }),
        scopeRow('user', '/home/mcp.json', { shared: { command: 'user' } }),
      ],
    })
    const byId = new Map(merged.servers.map(server => [server.id, server]))
    expect(byId.get('shared')?.scope).toBe('project')
    expect(byId.get('shared')?.path).toBe('/p/.dsh/mcp.json')
    expect(byId.get('shared')?.server.command).toBe('project')
    expect(byId.get('shared')?.shadowed.map(shadow => shadow.scope)).toEqual(['project', 'profile', 'user'])
    expect(byId.get('onlyCompat')?.scope).toBe('project')
    expect(byId.get('onlyCompat')?.compat).toBe(true)
    expect(byId.get('onlyCompat')?.writable).toBe(false)
    expect(merged.sources.map(row => row.path)).toEqual(['/p/.dsh/mcp.json', '/p/.mcp.json', '/home/profiles/x/mcp.json', '/home/mcp.json'])
  })

  it('reports invalid entries on their source row and keeps the rest', () => {
    const merged = mergeSources({
      scopes: [scopeRow('user', '/home/mcp.json', { good: { command: 'node' }, bad: { type: 'sse', url: 'https://x' } })],
    })
    expect(merged.servers.map(server => server.id)).toEqual(['good'])
    expect(merged.sources[0]?.problems?.[0]?.id).toBe('bad')
    expect(merged.sources[0]?.problems?.[0]?.error).toMatch(/unsupported transport/u)
  })
})

describe('registration expansion', () => {
  it('expands env templates but leaves credential references for dsh', () => {
    const server: StoredServer = {
      ...defaultServer('a'),
      command: 'node',
      env: { PATH: '${BIN}', TOKEN: '${credential:mcp-client/a}' },
      headers: { Authorization: 'Bearer ${TOKEN}' },
      url: '',
      transport: 'stdio',
    }
    const expanded = expandServer(server, { BIN: '/bin' })
    expect(expanded.missing).toEqual(['TOKEN'])
    expect(expanded.server.env.PATH).toBe('/bin')
    expect(expanded.server.env.TOKEN).toBe('${credential:mcp-client/a}')
    expect(expanded.server.headers.Authorization).toBe('Bearer ${TOKEN}')
  })
})
