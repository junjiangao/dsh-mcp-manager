/** The page's row model: merging sources, filtering, status copy, and JSON export. */

import { describe, expect, it } from 'vitest'
import type { McpManagedServerView } from '@deepseek-ai/dsh-mcp-manager'
import { buildSummaries, filterSummaries, rowToJson } from '../src/client/summary.ts'
import { countStatuses, describeStatus } from '../src/client/status.ts'
import type { Snapshot } from '../src/types.ts'

const t = (key: string, params?: Record<string, unknown>): string => params === undefined
  ? key
  : `${key}:${Object.values(params).join(',')}`

const snapshot: Snapshot = {
  writable: true,
  workspaces: [],
  sources: [],
  servers: [{
    id: 'file-one', label: 'file-one', enabled: true, transport: 'stdio', command: 'node', args: ['x'], cwd: '', url: '',
    env: { TOKEN: { set: true, sensitive: true, template: false, credential: false } }, headers: {},
    toolCallTimeoutMs: 60_000, startupTimeoutMs: 30_000, closeTimeoutMs: 5_000,
    reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 }, toolLoading: 'eager',
    scope: 'profile', path: '/p/mcp.json', writable: true, shadowed: [], templates: { env: [], headers: [], credentials: [] },
    registration: { state: 'registered' },
  }],
  tools: [
    { name: 'mcp__file-one__read', serverId: 'file-one', description: 'read', parameters: {}, enabled: true },
    { name: 'mcp__entry-one__write', serverId: 'entry-one', description: 'write', parameters: {}, enabled: true },
    { name: 'mcp__other__x', serverId: '', description: 'foreign', parameters: {}, enabled: true },
  ],
}

function managed(name: string, state: 'connected' | 'connecting' | 'failed'): McpManagedServerView {
  return {
    name,
    configured: false,
    status: state === 'connected'
      ? { state: 'connected', connectedAt: 1_000, toolCount: 2 }
      : state === 'connecting' ? { state: 'connecting', attempt: 0 } : { state: 'failed', reason: 'gave-up' },
  }
}

describe('buildSummaries', () => {
  it('merges entry rows before file rows and attaches runtime and tools', () => {
    const rows = buildSummaries(snapshot, [managed('file-one', 'connected'), managed('entry-one', 'connecting')], {
      'entry-one': { transport: 'streamable-http', url: 'https://x.test', enabled: true },
    }, { 'file-one': ['mcp__file-one__read'] }, true)
    expect(rows.map(row => `${row.kind}:${row.name}`)).toEqual(['entry:entry-one', 'file:file-one'])
    expect(rows[0]?.tools.map(tool => tool.name)).toEqual(['mcp__entry-one__write'])
    expect(rows[0]?.runtime?.status.state).toBe('connecting')
    expect(rows[1]?.env[0]).toEqual({ key: 'TOKEN', state: { set: true, sensitive: true, template: false, credential: false } })
    expect(rows[1]?.disabledTools).toEqual(['mcp__file-one__read'])
  })

  it('flags a name defined both as an entry and in a file', () => {
    const rows = buildSummaries(snapshot, [], { 'file-one': { command: 'node' } }, {}, true)
    expect(rows.find(row => row.kind === 'file')?.conflict).toBe(true)
    expect(rows.find(row => row.kind === 'entry')?.conflict).toBe(true)
  })

  it('marks entry rows readonly when the official form refuses writes', () => {
    const rows = buildSummaries(undefined, [], { a: { command: 'node' } }, {}, false)
    expect(rows[0]?.writable).toBe(false)
  })
})

describe('filters', () => {
  const rows = buildSummaries(snapshot, [managed('file-one', 'connected')], { 'entry-one': { command: 'node' } }, {}, true)
  it('filters by source and search text', () => {
    expect(filterSummaries(rows, '', 'entry', 'all').map(row => row.name)).toEqual(['entry-one'])
    expect(filterSummaries(rows, 'write', 'all', 'all').map(row => row.name)).toEqual(['entry-one'])
    expect(filterSummaries(rows, 'file-one', 'all', 'all').map(row => row.name)).toEqual(['file-one'])
  })
  it('filters by status bucket', () => {
    expect(filterSummaries(rows, '', 'all', 'connected').map(row => row.name)).toEqual(['file-one'])
    expect(filterSummaries(rows, '', 'all', 'unknown').map(row => row.name)).toEqual(['entry-one'])
  })
})

describe('status copy', () => {
  it('maps every official state to a tone and a readable line', () => {
    expect(describeStatus(undefined, t)).toEqual({ tone: 'idle', label: 'status.unknown' })
    const connected = describeStatus(managed('a', 'connected'), t)
    expect(connected.tone).toBe('done')
    expect(connected.label).toBe('status.connected')
    expect(connected.detail).toMatch(/^detail\.connected:2,\d{2}:\d{2}$/u)
    expect(describeStatus(managed('a', 'connecting'), t)).toEqual({ tone: 'ongoing', label: 'status.connecting', detail: 'detail.connecting:1' })
    expect(describeStatus(managed('a', 'failed'), t).tone).toBe('error')
    expect(describeStatus({ name: 'a', configured: false, status: { state: 'waiting-credentials', lastError: 'missing' } }, t))
      .toEqual({ tone: 'warning', label: 'status.waitingCredentials', detail: 'detail.waitingCredentials:missing' })
    expect(describeStatus({ name: 'a', configured: false, status: { state: 'waiting-authorization', reason: 'expired' } }, t))
      .toEqual({ tone: 'warning', label: 'status.waitingAuthorization', detail: 'detail.waitingAuthorization:authReason.expired' })
    expect(describeStatus({ name: 'a', configured: false, status: { state: 'disabled' } }, t)).toEqual({ tone: 'idle', label: 'status.disabled' })
  })

  it('counts the header chips', () => {
    const counts = countStatuses([
      managed('a', 'connected'), managed('b', 'connecting'), managed('c', 'failed'), undefined,
      { name: 'd', configured: false, status: { state: 'disabled' } },
    ])
    expect(counts).toEqual({ total: 5, connected: 1, busy: 1, attention: 1, disabled: 1 })
  })
})

describe('copy JSON', () => {
  it('renders the file entry shape without manager-only defaults', () => {
    const rows = buildSummaries(snapshot, [], {}, {}, true)
    expect(JSON.parse(rowToJson(rows[0] as never))).toEqual({ type: 'stdio', command: 'node', args: ['x'], env: { TOKEN: '' } })
  })
})
