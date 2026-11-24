/** Static preview of the MCP panel: the real component over fixture rows. */

import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { McpSection } from '../src/client/McpSection.tsx'
import { zh } from '../src/client/locales.ts'
import type { ManagerStore, ManagerView } from '../src/client/manager-store.ts'
import type { Snapshot } from '../src/types.ts'
import type { UpstreamConfig } from '../src/client/summary.ts'

const snapshot: Snapshot = {
  writable: true,
  projectPath: '/home/dev/acme',
  workspaces: [
    { id: '1', path: '/home/dev/acme', title: 'acme' },
    { id: '2', path: '/home/dev/scratch', title: 'scratch' },
  ],
  sources: [
    { scope: 'project', path: '/home/dev/acme/.dsh/mcp.json', writable: true, compat: false, exists: true, serverCount: 1 },
    { scope: 'project', path: '/home/dev/acme/.mcp.json', writable: false, compat: true, exists: true, serverCount: 1 },
    { scope: 'profile', path: '/home/dev/.dsh/profiles/desktop/mcp.json', writable: true, compat: false, exists: true, serverCount: 2 },
    { scope: 'user', path: '/home/dev/.dsh/mcp.json', writable: true, compat: false, exists: true, serverCount: 1 },
  ],
  servers: [
    {
      id: 'filesystem', label: 'filesystem', enabled: true, transport: 'stdio', command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/dev/acme'], cwd: '', url: '',
      env: {}, headers: {}, toolCallTimeoutMs: 60_000, startupTimeoutMs: 30_000, closeTimeoutMs: 5_000,
      reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 }, toolLoading: 'eager',
      scope: 'profile', path: '/home/dev/.dsh/profiles/desktop/mcp.json', writable: true, shadowed: ['user'],
      templates: { env: [], headers: [], credentials: [] }, registration: { state: 'registered' },
    },
    {
      id: 'project-api', label: 'project-api', enabled: true, transport: 'streamable-http',
      command: '', args: [], cwd: '', url: 'https://mcp.acme.test/api',
      env: {}, headers: { Authorization: { set: true, sensitive: true, template: false, credential: false } },
      toolCallTimeoutMs: 60_000, startupTimeoutMs: 30_000, closeTimeoutMs: 5_000,
      reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 }, toolLoading: 'on-demand',
      oauth: { credentialKey: 'mcp-client/project-api', requestTimeoutMs: 10_000, authorizationTimeoutMs: 600_000 },
      scope: 'project', path: '/home/dev/acme/.dsh/mcp.json', writable: true, shadowed: [],
      templates: { env: [], headers: [], credentials: [] }, registration: { state: 'registered' },
    },
    {
      id: 'claude-compat', label: 'claude-compat', enabled: true, transport: 'stdio', command: 'uvx',
      args: ['mcp-server-git'], cwd: '', url: '', env: {}, headers: {},
      toolCallTimeoutMs: 60_000, startupTimeoutMs: 30_000, closeTimeoutMs: 5_000,
      reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 }, toolLoading: 'eager',
      scope: 'project', path: '/home/dev/acme/.mcp.json', writable: false, shadowed: [],
      templates: { env: [], headers: [], credentials: [] }, registration: { state: 'registered' },
    },
    {
      id: 'templated', label: 'templated', enabled: true, transport: 'stdio', command: 'node',
      args: ['server.js'], cwd: '', url: '', env: { TOKEN: { set: false, sensitive: true, template: true, credential: false } }, headers: {},
      toolCallTimeoutMs: 60_000, startupTimeoutMs: 30_000, closeTimeoutMs: 5_000,
      reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 }, toolLoading: 'eager',
      scope: 'user', path: '/home/dev/.dsh/mcp.json', writable: true, shadowed: [],
      templates: { env: ['TOKEN'], headers: [], credentials: [] },
      registration: { state: 'missing-env', missing: ['TOKEN'] },
    },
  ],
  tools: [
    { name: 'mcp__filesystem__read_file', serverId: 'filesystem', description: '读取一个文件', parameters: {}, enabled: true },
    { name: 'mcp__filesystem__write_file', serverId: 'filesystem', description: '写入一个文件', parameters: {}, enabled: false },
    { name: 'mcp__project-api__create_issue', serverId: 'project-api', description: '创建工单', parameters: {}, enabled: true },
  ],
}

const upstream: UpstreamConfig = {
  servers: {
    'codebase-memory': { transport: 'stdio', command: 'codebase-memory-mcp', args: [], enabled: true },
    'entry-remote': {
      transport: 'streamable-http', url: 'https://mcp.example.test/mcp', enabled: true,
      oauth: { credentialKey: 'mcp-client/entry-remote', requestTimeoutMs: 10_000, authorizationTimeoutMs: 600_000 },
    },
  },
}

const view: ManagerView = {
  status: 'ready',
  snapshot,
  error: undefined,
  pollFailed: false,
  busy: false,
  notice: undefined,
  managed: [
    { name: 'filesystem', configured: false, status: { state: 'connected', connectedAt: Date.now() - 754_000, toolCount: 12 } },
    { name: 'project-api', configured: false, status: { state: 'waiting-authorization', reason: 'expired' } },
    { name: 'codebase-memory', configured: true, status: { state: 'connected', connectedAt: Date.now() - 61_000, toolCount: 8 } },
    { name: 'entry-remote', configured: true, status: { state: 'failed', reason: 'gave-up', error: 'ECONNREFUSED 127.0.0.1:9' } },
  ],
  streamFailed: false,
  upstream: { status: 'ready', writable: true, revision: 3, value: upstream },
  own: { status: 'ready', writable: true, revision: 3, value: { disabledTools: { filesystem: ['mcp__filesystem__write_file'] } } },
  projectPath: '/home/dev/acme',
  updatedAt: Date.now(),
}

const noop = async (): Promise<boolean> => true
const fakeStore: ManagerStore = {
  state: { getSnapshot: () => view, subscribe: () => () => {} },
  refresh: () => {},
  selectProject: () => {},
  notify: () => {},
  restart: noop,
  probe: async () => ({ ok: false, message: 'preview' }),
  authorize: async () => undefined,
  cancelAuthorization: noop,
  signOut: noop,
  upsertServer: noop,
  removeServer: noop,
  setEnabled: noop,
  setToolEnabled: noop,
  saveEntry: noop,
  removeEntry: noop,
  setEntryEnabled: noop,
  dispose: () => {},
} as unknown as ManagerStore

const t = (key: keyof typeof zh, params?: Record<string, unknown>): string => {
  const template = zh[key] ?? String(key)
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/gu, (match, name: string) => name in params ? String(params[name]) : match)
}

function Preview(): React.JSX.Element {
  const [dark, setDark] = React.useState(false)
  React.useEffect(() => {
    if (dark) document.body.setAttribute('data-ds-dark-theme', '')
    else document.body.removeAttribute('data-ds-dark-theme')
  }, [dark])
  return (
    <div className="preview-shell">
      <div className="preview-bar">
        <strong>dsh-mcp-manager · 静态预览</strong>
        <span>真实组件 + 固定数据；写入操作不会生效。</span>
        <button type="button" onClick={() => { setDark(value => !value) }}>{dark ? '浅色' : '深色'}</button>
      </div>
      <div className="preview-panel">
        <McpSection store={fakeStore} t={t as never} />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<Preview />)
