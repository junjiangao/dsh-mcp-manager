/** The panel store: read loop, status stream, and every write path over fakes. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { Snapshot } from '../src/types.ts'
import { createManagerStore, type ManagerStore } from '../src/client/manager-store.ts'
import type { ManagerClientApi } from '../src/client/api.ts'
import type { UpstreamFormFace } from '../src/client/entry-form.ts'
import type { EntryServer, UpstreamConfig } from '../src/client/summary.ts'

const t = (key: string, params?: Record<string, unknown>): string => params === undefined ? key : `${key}:${JSON.stringify(params)}`

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return { writable: true, servers: [], tools: [], sources: [], workspaces: [], ...overrides }
}

function deferred<T>(): { readonly promise: Promise<T>; resolve(value: T): void; reject(error: unknown): void } {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((accept, decline) => { resolve = accept; reject = decline })
  return { promise, resolve, reject }
}

interface StreamBox {
  push(value: readonly unknown[]): void
}

function fakeContext(): { ctx: Context; box: StreamBox; emit(event: string): void; resetCount(): number } {
  const listeners = new Map<string, () => void>()
  let pending: ((value: IteratorResult<{ value: readonly unknown[]; accept(): void }>) => void) | undefined
  const queue: { value: readonly unknown[]; accept(): void }[] = []
  const box: StreamBox = {
    push(value) {
      const item = { value, accept: () => {} }
      if (pending === undefined) queue.push(item)
      else {
        const accept = pending
        pending = undefined
        accept({ done: false, value: item })
      }
    },
  }
  const handle = {
    [Symbol.asyncIterator]: () => ({
      next: () => {
        const item = queue.shift()
        if (item !== undefined) return Promise.resolve({ done: false as const, value: item })
        return new Promise<IteratorResult<{ value: readonly unknown[]; accept(): void }>>((accept) => { pending = accept })
      },
      return: () => Promise.resolve({ done: true as const, value: undefined }),
    }),
    dispose: () => {},
  }
  const remote = {
    $stream: (options: { open(signal: AbortSignal): typeof handle }) => options.open(new AbortController().signal),
    mcpManager: {
      watch: () => handle,
      restart: async () => ({ ok: true }),
      probe: async () => ({ ok: true, value: { ok: true, toolNames: ['a'], truncated: false, durationMs: 3, closeConfirmed: true } }),
    },
  }
  let resets = 0
  const ctx = {
    remote,
    on: (event: string, listener: () => void) => {
      listeners.set(event, listener)
      return () => { listeners.delete(event) }
    },
    get: () => undefined,
    logger: { warn: () => {} },
  } as unknown as Context
  return {
    ctx,
    box,
    emit: (event) => {
      const listener = listeners.get(event)
      if (listener === undefined) return
      if (event === 'connection/reset') resets += 1
      listener()
    },
    resetCount: () => resets,
  }
}

function fakeForms(): {
  upstream: UpstreamFormFace
  own: { setDisabledTools: ReturnType<typeof vi.fn>; snapshot: () => unknown; subscribe: () => () => void; namespace: string }
  calls: { upstream: { setServer: unknown[][]; removeServer: string[]; setEnabled: [string, boolean][] } }
} {
  const calls = { upstream: { setServer: [] as unknown[][], removeServer: [] as string[], setEnabled: [] as [string, boolean][] } }
  const upstreamState = { status: 'ready' as const, writable: true, revision: 1, value: { servers: { a: { command: 'node' } } } as UpstreamConfig }
  const upstream: UpstreamFormFace = {
    namespace: 'mcp-manager',
    snapshot: () => upstreamState,
    subscribe: () => () => {},
    setServer: async (name: string, entry: EntryServer) => { calls.upstream.setServer.push([name, entry]); return true },
    removeServer: async (name: string) => { calls.upstream.removeServer.push(name); return true },
    setEnabled: async (name: string, enabled: boolean) => { calls.upstream.setEnabled.push([name, enabled]); return true },
  }
  const setDisabledTools = vi.fn(async () => true)
  const own = {
    namespace: 'dsh-mcp-manager',
    snapshot: () => ({ status: 'ready' as const, writable: true, revision: 1, value: { disabledTools: { a: ['mcp__a__x'] } } }),
    subscribe: () => () => {},
    setDisabledTools,
  }
  return { upstream, own, calls }
}

function apiWith(snap: () => Promise<Snapshot>): ManagerClientApi {
  return {
    snapshot: vi.fn(snap),
    upsertServer: vi.fn(async () => snapshot()),
    removeServer: vi.fn(async () => snapshot()),
    setServerEnabled: vi.fn(async () => snapshot()),
    authorize: vi.fn(async () => ({ id: 'attempt-1', phase: 'waiting-browser' as const, authorizationUrl: 'https://auth' })),
    cancelAuthorization: vi.fn(async () => null),
    signOut: vi.fn(async () => null),
  } as unknown as ManagerClientApi
}

let store: ManagerStore | undefined
afterEach(() => { store?.dispose(); store = undefined; vi.useRealTimers() })

describe('manager store', () => {
  it('loads the first snapshot and publishes the status stream', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    store = createManagerStore(fake.ctx, apiWith(async () => snapshot({ projectPath: '/p' })), forms.upstream, forms.own, t)
    await vi.waitFor(() => { expect(store?.state.getSnapshot().status).toBe('ready') })
    expect(store.state.getSnapshot().projectPath).toBe('/p')

    fake.box.push([{ name: 'a', configured: true, status: { state: 'connected', connectedAt: 1, toolCount: 1 } }])
    await vi.waitFor(() => { expect(store?.state.getSnapshot().managed).toHaveLength(1) })
    expect(store.state.getSnapshot().streamFailed).toBe(false)
  })

  it('keeps a standing snapshot when a later poll fails', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    let fail = false
    store = createManagerStore(fake.ctx, apiWith(async () => {
      if (fail) throw new Error('offline')
      return snapshot()
    }), forms.upstream, forms.own, t)
    await vi.waitFor(() => { expect(store?.state.getSnapshot().status).toBe('ready') })
    fail = true
    store.refresh()
    await vi.waitFor(() => { expect(store?.state.getSnapshot().pollFailed).toBe(true) })
    expect(store.state.getSnapshot().snapshot).toBeDefined()
  })

  it('reads a new project selection', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    const api = apiWith(async () => snapshot())
    store = createManagerStore(fake.ctx, api, forms.upstream, forms.own, t)
    await vi.waitFor(() => { expect(store?.state.getSnapshot().status).toBe('ready') })
    store.selectProject('/workspace')
    await vi.waitFor(() => { expect(api.snapshot).toHaveBeenCalledWith({ projectPath: '/workspace' }, expect.anything()) })
  })

  it('restarts through the official remote and reports it', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    store = createManagerStore(fake.ctx, apiWith(async () => snapshot()), forms.upstream, forms.own, t)
    await vi.waitFor(() => { expect(store?.state.getSnapshot().status).toBe('ready') })
    await expect(store.restart('a')).resolves.toBe(true)
    expect(store.state.getSnapshot().notice).toEqual({ tone: 'success', text: 'notice.restarted:{"name":"a"}' })
  })

  it('runs a probe and returns its result', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    store = createManagerStore(fake.ctx, apiWith(async () => snapshot()), forms.upstream, forms.own, t)
    const outcome = await store.probe('a')
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.result.ok).toBe(true)
  })

  it('writes an official entry and a file patch through the right roads', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    store = createManagerStore(fake.ctx, apiWith(async () => snapshot()), forms.upstream, forms.own, t)
    await vi.waitFor(() => { expect(store?.state.getSnapshot().status).toBe('ready') })
    await expect(store.saveEntry('a', { command: 'deno' })).resolves.toBe(true)
    expect(forms.calls.upstream.setServer).toEqual([['a', { command: 'deno' }]])
    await expect(store.upsertServer({ scope: 'profile', server: { id: 'b', transport: 'stdio', command: 'node' } })).resolves.toBe(true)
  })

  it('adds and removes one disabled tool through the own form', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    store = createManagerStore(fake.ctx, apiWith(async () => snapshot()), forms.upstream, forms.own, t)
    await vi.waitFor(() => { expect(store?.state.getSnapshot().status).toBe('ready') })
    await expect(store.setToolEnabled('a', 'mcp__a__y', false)).resolves.toBe(true)
    expect(forms.own.setDisabledTools).toHaveBeenCalledWith('a', ['mcp__a__x', 'mcp__a__y'])
    await expect(store.setToolEnabled('a', 'mcp__a__x', true)).resolves.toBe(true)
    expect(forms.own.setDisabledTools).toHaveBeenCalledWith('a', [])
  })

  it('authorizes, cancels, and signs out through the Host RPC', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    const api = apiWith(async () => snapshot())
    store = createManagerStore(fake.ctx, api, forms.upstream, forms.own, t)
    await expect(store.authorize('a')).resolves.toMatchObject({ phase: 'waiting-browser' })
    await expect(store.cancelAuthorization('a', 'attempt-1')).resolves.toBe(true)
    await expect(store.signOut('a')).resolves.toBe(true)
    expect(api.cancelAuthorization).toHaveBeenCalledWith({ name: 'a', id: 'attempt-1' })
    expect(api.signOut).toHaveBeenCalledWith({ name: 'a' })
  })

  it('reopens the stream after a connection reset', async () => {
    const fake = fakeContext()
    const forms = fakeForms()
    store = createManagerStore(fake.ctx, apiWith(async () => snapshot()), forms.upstream, forms.own, t)
    await vi.waitFor(() => { expect(store?.state.getSnapshot().status).toBe('ready') })
    fake.emit('connection/reset')
    expect(fake.resetCount()).toBe(1)
    await vi.waitFor(() => { expect(store?.state.getSnapshot().status).toBe('ready') })
  })
})
