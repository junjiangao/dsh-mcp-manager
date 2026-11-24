/**
 * The panel's data layer, held in the official client store.
 *
 * Three sources feed one reference-stable snapshot:
 *
 * 1. the Host's `snapshot` RPC (file scopes, registration outcomes, tools);
 * 2. the official `mcpManager.watch` stream (live status and OAuth attempts);
 * 3. the two official shared forms (`mcp-manager` entries and this plugin's
 *    own `disabledTools`), which the Host writes through the settings service.
 *
 * Live status is push-based, so the file snapshot can poll at a calm interval
 * without making the page feel stale. Every operation publishes through this
 * store, and a monotonic sequence keeps a slow read from overwriting a newer
 * one.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { McpManagedServerView } from '@deepseek-ai/dsh-mcp-manager'
import type { McpProbeResult } from '@deepseek-ai/dsh-mcp-client/types'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { AuthorizationResult, ManagedServerView, McpScope, ServerPatch, Snapshot } from '../types.ts'
import type { ManagerClientApi } from './api.ts'
import type { FormState, OwnFormFace, UpstreamFormFace } from './entry-form.ts'
import type { EntryServer, ServerSummary, UpstreamConfig } from './summary.ts'
import type { McpLocaleKey } from './locales.ts'

/** How often a visible page re-reads the file scopes and tools. */
const POLL_INTERVAL_MS = 2_000

interface StreamItem<T> {
  readonly value: T
  accept(): void
}

interface StreamHandle<T> extends AsyncIterable<StreamItem<T>> {
  dispose?(): void
}

interface RemoteResultLike<T> {
  readonly ok: boolean
  readonly value?: T
  readonly error?: { readonly code?: string; readonly message?: string }
}

interface McpManagerRemote {
  watch(signal: AbortSignal): StreamHandle<readonly McpManagedServerView[]>
  restart(name: string): Promise<RemoteResultLike<void>>
  probe(name: string, signal?: AbortSignal): Promise<RemoteResultLike<McpProbeResult>>
}

interface StreamFactory {
  $stream<T>(options: {
    readonly name: string
    readonly open: (signal: AbortSignal) => StreamHandle<T>
    readonly ended: () => Error
    readonly carrierFailed: () => void
  }): StreamHandle<T>
  readonly mcpManager: McpManagerRemote
}

export interface ManagerNotice {
  readonly tone: 'success' | 'error'
  readonly text: string
}

/**
 * Everything the page renders, plus the state its operations own.
 *
 * The fields are mutable because `SnapshotStore.update` hands the mutator this
 * exact type; the store freezes every published snapshot, so nothing outside a
 * mutator can write one.
 */
export interface ManagerView {
  status: 'loading' | 'ready' | 'error'
  snapshot: Snapshot | undefined
  /** The first read's failure, while no snapshot stands. */
  error: string | undefined
  /** A background read failed; a standing snapshot keeps serving. */
  pollFailed: boolean
  /** A user operation is crossing the wire. */
  busy: boolean
  /** The last operation's refusal, or a success confirmation (already translated by the caller). */
  notice: ManagerNotice | undefined
  /** The official manager's live list, or the last list received. */
  managed: readonly McpManagedServerView[]
  /** The status stream's carrier failed; the page keeps the last list. */
  streamFailed: boolean
  /** The official `mcp-manager` entry form. */
  upstream: FormState<UpstreamConfig>
  /** This plugin's own entry form (`disabledTools`). */
  own: FormState<{ disabledTools?: Record<string, string[]> }>
  /** Registered workspace root the project scope reads and writes. */
  projectPath: string | undefined
  /** Last successful read, epoch milliseconds. */
  updatedAt: number | undefined
}

export interface ManagerStore {
  readonly state: SnapshotStore<ManagerView>
  selectProject(projectPath: string | undefined): void
  refresh(): void
  notify(text: string, tone?: ManagerNotice['tone']): void
  clearNotice(): void
  upsertServer(request: { readonly scope: McpScope; readonly server: ServerPatch }): Promise<boolean>
  removeServer(row: ServerSummary): Promise<boolean>
  setEnabled(row: ServerSummary, enabled: boolean): Promise<boolean>
  restart(name: string): Promise<boolean>
  probe(name: string): Promise<{ readonly ok: true; readonly result: McpProbeResult } | { readonly ok: false; readonly message: string }>
  authorize(name: string): Promise<AuthorizationResult | undefined>
  cancelAuthorization(name: string, id: string): Promise<boolean>
  signOut(name: string): Promise<boolean>
  saveEntry(name: string, entry: EntryServer): Promise<boolean>
  removeEntry(name: string): Promise<boolean>
  setEntryEnabled(name: string, enabled: boolean): Promise<boolean>
  setToolEnabled(server: string, tool: string, enabled: boolean): Promise<boolean>
  dispose(): void
}

/**
 * Create the store and start its read loop.
 * @param ctx - the browser plugin context (connection, remote, forms).
 * @param api - the Host RPC face.
 * @param upstream - the official entry form face.
 * @param own - this plugin's entry form face.
 * @param translate - the page translator, used for notices.
 */
export function createManagerStore(
  ctx: Context,
  api: ManagerClientApi,
  upstream: UpstreamFormFace,
  own: OwnFormFace,
  translate: (key: McpLocaleKey, params?: Record<string, unknown>) => string,
): ManagerStore {
  const initial: ManagerView = {
    status: 'loading',
    snapshot: undefined,
    error: undefined,
    pollFailed: false,
    busy: false,
    notice: undefined,
    managed: [],
    streamFailed: false,
    upstream: upstream.snapshot(),
    own: own.snapshot(),
    projectPath: undefined,
    updatedAt: undefined,
  }
  const state = createSnapshotStore<ManagerView>(initial)
  let disposed = false
  let sequence = 0
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let stream: StreamHandle<readonly McpManagedServerView[]> | undefined
  let streamAbort: AbortController | undefined
  let observing: Promise<void> | undefined
  const disposers: (() => void)[] = []
  const t = translate

  const patch = (mutate: (draft: ManagerView) => void): void => { state.update(mutate) }

  const requestRefresh = (): void => {
    if (disposed) return
    const current = state.getSnapshot()
    const request = ++sequence
    void api.snapshot(current.projectPath === undefined ? {} : { projectPath: current.projectPath }, streamAbort?.signal)
      .then((snapshot) => {
        if (disposed || request !== sequence) return
        patch((draft) => {
          draft.status = 'ready'
          draft.snapshot = snapshot
          draft.error = undefined
          draft.pollFailed = false
          draft.projectPath = snapshot.projectPath
          draft.updatedAt = Date.now()
        })
      })
      .catch((error: unknown) => {
        if (disposed || request !== sequence) return
        const message = errorMessage(error)
        patch((draft) => {
          if (draft.snapshot === undefined) {
            draft.status = 'error'
            draft.error = message
          } else {
            draft.pollFailed = true
          }
        })
      })
  }

  const begin = (): void => { patch((draft) => { draft.busy = true }) }
  const end = (): void => { patch((draft) => { draft.busy = false }) }
  const succeed = (text: string): void => { patch((draft) => { draft.notice = { tone: 'success', text } }) }
  const fail = (error: unknown): void => { patch((draft) => { draft.notice = { tone: 'error', text: t('notice.failed', { message: errorMessage(error) }) } }) }

  const disposeStream = (): void => {
    try { stream?.dispose?.() } catch { /* teardown is best effort */ }
    stream = undefined
    try { streamAbort?.abort() } catch { /* already gone */ }
    streamAbort = undefined
  }

  const openStream = (): void => {
    if (disposed) return
    disposeStream()
    const remote = (ctx.remote as unknown as StreamFactory)
    const controller = new AbortController()
    streamAbort = controller
    const handle = remote.$stream<readonly McpManagedServerView[]>({
      name: 'MCP server status',
      open: signal => remote.mcpManager.watch(signal),
      ended: () => new Error('MCP server status stream ended'),
      carrierFailed: () => {
        if (!disposed) patch((draft) => { draft.streamFailed = true })
      },
    })
    stream = handle
    observing = (async () => {
      try {
        for await (const item of handle) {
          if (disposed) return
          patch((draft) => {
            draft.managed = item.value
            draft.streamFailed = false
          })
          item.accept()
        }
      } catch {
        if (!disposed) patch((draft) => { draft.streamFailed = true })
      }
    })()
  }

  const startPolling = (): void => {
    if (pollTimer !== undefined) return
    pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      requestRefresh()
    }, POLL_INTERVAL_MS)
  }

  const applyOperation = async (operation: () => Promise<void>, success: string): Promise<boolean> => {
    if (state.getSnapshot().busy) return false
    begin()
    try {
      await operation()
      succeed(success)
      requestRefresh()
      return true
    } catch (error) {
      fail(error)
      return false
    } finally {
      end()
    }
  }

  disposers.push(upstream.subscribe(() => {
    patch((draft) => { draft.upstream = upstream.snapshot() })
  }))
  disposers.push(own.subscribe(() => {
    patch((draft) => { draft.own = own.snapshot() })
  }))
  const onReset = (): void => {
    requestRefresh()
    openStream()
  }
  disposers.push(ctx.on('connection/reset', onReset))
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') requestRefresh()
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
  disposers.push(() => {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
  })

  openStream()
  requestRefresh()
  startPolling()

  const store: ManagerStore = {
    state,
    selectProject: (projectPath) => {
      patch((draft) => { draft.projectPath = projectPath })
      requestRefresh()
    },
    refresh: requestRefresh,
    notify: (text, tone = 'success') => {
      patch((draft) => { draft.notice = { tone, text } })
    },
    clearNotice: () => {
      patch((draft) => { draft.notice = undefined })
    },
    upsertServer: request => applyOperation(
      async () => { await api.upsertServer({ scope: request.scope, server: request.server, ...currentProject(state) }) },
      t('notice.saved', { name: request.server.id }),
    ),
    removeServer: row => {
      if (row.kind === 'entry') return store.removeEntry(row.name)
      return applyOperation(
        async () => { await api.removeServer({ id: row.name, ...currentProject(state) }) },
        t('notice.deleted', { name: row.name }),
      )
    },
    setEnabled: (row, enabled) => {
      if (row.kind === 'entry') return store.setEntryEnabled(row.name, enabled)
      return applyOperation(
        async () => { await api.setServerEnabled({ id: row.name, enabled, ...currentProject(state) }) },
        t(enabled ? 'notice.enabled' : 'notice.disabled', { name: row.name }),
      )
    },
    restart: name => applyOperation(
      async () => {
        const result = await (ctx.remote as unknown as StreamFactory).mcpManager.restart(name)
        if (!result.ok) throw new Error(remoteErrorText(result))
      },
      t('notice.restarted', { name }),
    ),
    probe: async (name) => {
      const remote = (ctx.remote as unknown as StreamFactory).mcpManager
      const controller = new AbortController()
      const timer = setTimeout(() => { controller.abort() }, 20_000)
      try {
        const result = await remote.probe(name, controller.signal)
        if (!result.ok || result.value === undefined) {
          patch((draft) => { draft.notice = { tone: 'error', text: t('notice.probeFailed', { name }) } })
          return { ok: false, message: remoteErrorText(result) }
        }
        patch((draft) => {
          draft.notice = result.value?.ok === true
            ? { tone: 'success', text: t('notice.probeOk', { name }) }
            : { tone: 'error', text: t('notice.probeFailed', { name }) }
        })
        return { ok: true, result: result.value }
      } catch (error) {
        fail(error)
        return { ok: false, message: errorMessage(error) }
      } finally {
        clearTimeout(timer)
      }
    },
    authorize: async (name) => {
      begin()
      try {
        const result = await api.authorize({ name })
        patch((draft) => { draft.notice = { tone: 'success', text: t('notice.authorized') } })
        requestRefresh()
        return result
      } catch (error) {
        fail(error)
        return undefined
      } finally {
        end()
      }
    },
    cancelAuthorization: (name, id) => applyOperation(
      async () => { await api.cancelAuthorization({ name, id }) },
      t('notice.authorized'),
    ),
    signOut: name => applyOperation(
      async () => { await api.signOut({ name }) },
      t('notice.signedOut', { name }),
    ),
    saveEntry: (name, entry) => applyOperation(
      async () => { if (!(await upstream.setServer(name, entry))) throw new Error(t('editor.conflict')) },
      t('notice.saved', { name }),
    ),
    removeEntry: name => applyOperation(
      async () => { if (!(await upstream.removeServer(name))) throw new Error(t('editor.conflict')) },
      t('notice.deleted', { name }),
    ),
    setEntryEnabled: (name, enabled) => applyOperation(
      async () => { if (!(await upstream.setEnabled(name, enabled))) throw new Error(t('editor.conflict')) },
      t(enabled ? 'notice.enabled' : 'notice.disabled', { name }),
    ),
    setToolEnabled: (server, tool, enabled) => {
      const current = state.getSnapshot().own.value?.disabledTools?.[server] ?? []
      const next = enabled ? current.filter(name => name !== tool) : [...new Set([...current, tool])]
      begin()
      try {
        return own.setDisabledTools(server, next).then((accepted) => {
          if (accepted) requestRefresh()
          return accepted
        }, () => false).finally(() => { end() })
      } catch {
        end()
        return Promise.resolve(false)
      }
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      if (pollTimer !== undefined) clearInterval(pollTimer)
      pollTimer = undefined
      for (const dispose of disposers.splice(0)) dispose()
      disposeStream()
      void observing
    },
  }
  return store
}

/** The project target every file write carries, or nothing when none is selected. */
function currentProject(state: SnapshotStore<ManagerView>): { projectPath?: string } {
  const projectPath = state.getSnapshot().projectPath
  return projectPath === undefined ? {} : { projectPath }
}

function remoteErrorText(result: RemoteResultLike<unknown>): string {
  const error = result.error
  if (error === undefined) return 'remote call failed'
  return error.message ?? error.code ?? 'remote call failed'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
