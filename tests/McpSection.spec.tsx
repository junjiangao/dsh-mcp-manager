// @vitest-environment jsdom

import * as React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { Snapshot } from '../src/types.ts'
import type { EntryServer } from '../src/client/summary.ts'
import { McpSection, type McpSectionProps } from '../src/client/McpSection.tsx'
import { createManagerStore, type ManagerStore } from '../src/client/manager-store.ts'
import type { ManagerClientApi } from '../src/client/api.ts'
import type { UpstreamFormFace } from '../src/client/entry-form.ts'

const t = ((key: string, params?: Record<string, unknown>) => params === undefined ? key : `${key}:${Object.values(params).join(',')}`) as McpSectionProps['t']

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return { writable: true, servers: [], tools: [], sources: [], workspaces: [], ...overrides }
}

function fileServer(overrides: Partial<Snapshot['servers'][number]> = {}): Snapshot['servers'][number] {
  return {
    id: 'demo', label: 'demo', enabled: true, transport: 'stdio', command: 'node', args: [], cwd: '', url: '',
    env: { TOKEN: { set: true, sensitive: true, template: false, credential: false } }, headers: {},
    toolCallTimeoutMs: 60_000, startupTimeoutMs: 30_000, closeTimeoutMs: 5_000,
    reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 }, toolLoading: 'eager',
    scope: 'profile', path: '/p/mcp.json', writable: true, shadowed: [], templates: { env: [], headers: [], credentials: [] },
    registration: { state: 'registered' },
    ...overrides,
  }
}

function api(snap: () => Promise<Snapshot>): ManagerClientApi {
  return {
    snapshot: vi.fn(snap),
    upsertServer: vi.fn(async () => snapshot()),
    removeServer: vi.fn(async () => snapshot()),
    setServerEnabled: vi.fn(async () => snapshot()),
    authorize: vi.fn(async () => ({ id: 'a', phase: 'waiting-browser' as const })),
    cancelAuthorization: vi.fn(async () => null),
    signOut: vi.fn(async () => null),
  } as unknown as ManagerClientApi
}

function streamHandle(): { [Symbol.asyncIterator](): { next(): Promise<IteratorResult<never>>; return(): Promise<IteratorResult<never>> }; dispose(): void } {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => new Promise<never>(() => {}),
      return: () => Promise.resolve({ done: true as const, value: undefined as never }),
    }),
    dispose: () => {},
  }
}

function storeOf(client: ManagerClientApi, forms: { upstream: UpstreamFormFace; own: { setDisabledTools: (name: string, tools: readonly string[]) => Promise<boolean> } }): ManagerStore {
  const handle = streamHandle()
  const ctx = {
    remote: {
      $stream: (options: { open(signal: AbortSignal): typeof handle }) => options.open(new AbortController().signal),
      mcpManager: {
        watch: () => handle,
        restart: async () => ({ ok: true }),
        probe: async () => ({ ok: true, value: { ok: true, toolNames: ['mcp__demo__read'], truncated: false, durationMs: 4, closeConfirmed: true } }),
      },
    },
    on: () => () => {},
    get: () => undefined,
    logger: { warn: () => {} },
  } as unknown as Context
  const ownFace = {
    namespace: 'dsh-mcp-manager',
    snapshot: () => ({ status: 'ready' as const, writable: true, revision: 1, value: { disabledTools: {} } }),
    subscribe: () => () => {},
    setDisabledTools: forms.own.setDisabledTools,
  }
  return createManagerStore(ctx, client, forms.upstream, ownFace, t)
}

function makeForms(servers: Record<string, EntryServer> = {}): {
  upstream: UpstreamFormFace
  own: { setDisabledTools: ReturnType<typeof vi.fn> }
  setServer: ReturnType<typeof vi.fn>
} {
  const state = { status: 'ready' as const, writable: true, revision: 1, value: { servers } }
  const setServer = vi.fn(async () => true)
  const removeServer = vi.fn(async () => true)
  const setEnabled = vi.fn(async () => true)
  return {
    setServer,
    upstream: {
      namespace: 'mcp-manager',
      snapshot: () => state,
      subscribe: () => () => {},
      setServer,
      removeServer,
      setEnabled,
    },
    own: { setDisabledTools: vi.fn(async () => true) },
  }
}

let store: ManagerStore | undefined
afterEach(() => {
  cleanup()
  store?.dispose()
  store = undefined
  vi.restoreAllMocks()
})

async function renderReady(client: ManagerClientApi, forms = makeForms()): Promise<ReturnType<typeof render>> {
  store = storeOf(client, forms)
  const view = render(<McpSection store={store} t={t} />)
  await waitFor(() => expect(store?.state.getSnapshot().status).toBe('ready'))
  return view
}

describe('MCP panel', () => {
  it('shows the loading, error, and empty states', async () => {
    const pending = api(() => new Promise<Snapshot>(() => {}))
    store = storeOf(pending, makeForms())
    render(<McpSection store={store} t={t} />)
    expect(screen.getByText('loading.servers')).toBeTruthy()
    cleanup()

    const failing = api(async () => { throw new Error('boom') })
    store?.dispose()
    store = storeOf(failing, makeForms())
    render(<McpSection store={store} t={t} />)
    await waitFor(() => expect(screen.getByText(/error\.snapshot/u)).toBeTruthy())
    cleanup()

    store?.dispose()
    store = storeOf(api(async () => snapshot()), makeForms())
    render(<McpSection store={store} t={t} />)
    await waitFor(() => expect(screen.getByText('empty.title')).toBeTruthy())
    expect(screen.getByText('empty.description')).toBeTruthy()
  })

  it('renders a file server with its status, source, and tool list', async () => {
    const client = api(async () => snapshot({
      servers: [fileServer()],
      tools: [{ name: 'mcp__demo__read', serverId: 'demo', description: 'read a file', parameters: {}, enabled: true }],
    }))
    await renderReady(client)
    expect(screen.getByText('demo')).toBeTruthy()
    expect(screen.getByText('scope.profile')).toBeTruthy()
    fireEvent.click(screen.getByText(/card\.tools/u))
    expect(screen.getByText(/read a file/u)).toBeTruthy()
  })

  it('keeps empty status buckets static', async () => {
    const client = api(async () => snapshot({ servers: [fileServer()] }))
    const view = await renderReady(client)
    expect(view.container.querySelector('[data-state="ongoing"]')).toBeNull()
  })

  it('filters by search text and by source', async () => {
    const client = api(async () => snapshot({ servers: [fileServer(), fileServer({ id: 'other', label: 'other' })] }))
    await renderReady(client, makeForms({ 'entry-one': { command: 'node' } }))
    fireEvent.change(screen.getByPlaceholderText('filter.searchPlaceholder'), { target: { value: 'other' } })
    await waitFor(() => expect(screen.queryByText('demo')).toBeNull())
    expect(screen.getByText('other')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('filter.searchPlaceholder'), { target: { value: '' } })
    fireEvent.click(screen.getByText('source.entry'))
    await waitFor(() => expect(screen.queryByText('demo')).toBeNull())
    expect(screen.getByText('entry-one')).toBeTruthy()
  })

  it('edits a file server through the Host RPC', async () => {
    const client = api(async () => snapshot({ servers: [fileServer()] }))
    await renderReady(client)
    fireEvent.click(screen.getByText('edit'))
    await waitFor(() => expect(screen.getByText(/editor\.edit/u)).toBeTruthy())
    fireEvent.change(screen.getByLabelText(/editor\.name/u), { target: { value: 'renamed' } })
    fireEvent.click(screen.getByText('save'))
    await waitFor(() => expect(client.upsertServer).toHaveBeenCalled())
    const request = (client.upsertServer as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { server: { id: string } }
    expect(request.server.id).toBe('renamed')
  })

  it('edits an official entry through the shared form', async () => {
    const client = api(async () => snapshot())
    const forms = makeForms({ 'entry-one': { command: 'node', args: ['x'] } })
    await renderReady(client, forms)
    fireEvent.click(screen.getByText('edit'))
    await waitFor(() => expect(screen.getByText(/editor\.edit/u)).toBeTruthy())
    fireEvent.change(screen.getByLabelText('editor.command'), { target: { value: 'deno' } })
    fireEvent.click(screen.getByText('save'))
    await waitFor(() => expect(forms.setServer).toHaveBeenCalled())
    expect(forms.setServer.mock.calls[0]?.[0]).toBe('entry-one')
  })

  it('asks before deleting and then removes the server', async () => {
    const client = api(async () => snapshot({ servers: [fileServer()] }))
    await renderReady(client)
    fireEvent.click(screen.getByText('delete'))
    await waitFor(() => expect(screen.getByText('confirm.deleteDescription:demo')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('confirm.acknowledge'))
    fireEvent.click(screen.getByText('confirm.delete'))
    await waitFor(() => expect(client.removeServer).toHaveBeenCalledWith({ id: 'demo' }))
  })

  it('probes a server and shows the result', async () => {
    const client = api(async () => snapshot({ servers: [fileServer()] }))
    await renderReady(client)
    fireEvent.click(screen.getByText('action.probe'))
    await waitFor(() => expect(screen.getByText('probe.success')).toBeTruthy())
    expect(screen.getByText(/mcp__demo__read/u)).toBeTruthy()
  })

  it('disables one tool through the own form', async () => {
    const client = api(async () => snapshot({
      servers: [fileServer()],
      tools: [{ name: 'mcp__demo__read', serverId: 'demo', description: 'read', parameters: {}, enabled: true }],
    }))
    const forms = makeForms()
    await renderReady(client, forms)
    fireEvent.click(screen.getByText(/card\.tools/u))
    fireEvent.click(screen.getByLabelText('tool.disable'))
    await waitFor(() => expect(forms.own.setDisabledTools).toHaveBeenCalledWith('demo', ['mcp__demo__read']))
  })
})
