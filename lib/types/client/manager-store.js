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
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
/** How often a visible page re-reads the file scopes and tools. */
const POLL_INTERVAL_MS = 2_000;
/**
 * Create the store and start its read loop.
 * @param ctx - the browser plugin context (connection, remote, forms).
 * @param api - the Host RPC face.
 * @param upstream - the official entry form face.
 * @param own - this plugin's entry form face.
 * @param translate - the page translator, used for notices.
 */
export function createManagerStore(ctx, api, upstream, own, translate) {
    const initial = {
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
    };
    const state = createSnapshotStore(initial);
    let disposed = false;
    let sequence = 0;
    let pollTimer;
    let stream;
    let streamAbort;
    let observing;
    const disposers = [];
    const t = translate;
    const patch = (mutate) => { state.update(mutate); };
    const requestRefresh = () => {
        if (disposed)
            return;
        const current = state.getSnapshot();
        const request = ++sequence;
        void api.snapshot(current.projectPath === undefined ? {} : { projectPath: current.projectPath }, streamAbort?.signal)
            .then((snapshot) => {
            if (disposed || request !== sequence)
                return;
            patch((draft) => {
                draft.status = 'ready';
                draft.snapshot = snapshot;
                draft.error = undefined;
                draft.pollFailed = false;
                draft.projectPath = snapshot.projectPath;
                draft.updatedAt = Date.now();
            });
        })
            .catch((error) => {
            if (disposed || request !== sequence)
                return;
            const message = errorMessage(error);
            patch((draft) => {
                if (draft.snapshot === undefined) {
                    draft.status = 'error';
                    draft.error = message;
                }
                else {
                    draft.pollFailed = true;
                }
            });
        });
    };
    const begin = () => { patch((draft) => { draft.busy = true; }); };
    const end = () => { patch((draft) => { draft.busy = false; }); };
    const succeed = (text) => { patch((draft) => { draft.notice = { tone: 'success', text }; }); };
    const fail = (error) => { patch((draft) => { draft.notice = { tone: 'error', text: t('notice.failed', { message: errorMessage(error) }) }; }); };
    const disposeStream = () => {
        try {
            stream?.dispose?.();
        }
        catch { /* teardown is best effort */ }
        stream = undefined;
        try {
            streamAbort?.abort();
        }
        catch { /* already gone */ }
        streamAbort = undefined;
    };
    const openStream = () => {
        if (disposed)
            return;
        disposeStream();
        const remote = ctx.remote;
        const controller = new AbortController();
        streamAbort = controller;
        const handle = remote.$stream({
            name: 'MCP server status',
            open: signal => remote.mcpManager.watch(signal),
            ended: () => new Error('MCP server status stream ended'),
            carrierFailed: () => {
                if (!disposed)
                    patch((draft) => { draft.streamFailed = true; });
            },
        });
        stream = handle;
        observing = (async () => {
            try {
                for await (const item of handle) {
                    if (disposed)
                        return;
                    patch((draft) => {
                        draft.managed = item.value;
                        draft.streamFailed = false;
                    });
                    item.accept();
                }
            }
            catch {
                if (!disposed)
                    patch((draft) => { draft.streamFailed = true; });
            }
        })();
    };
    const startPolling = () => {
        if (pollTimer !== undefined)
            return;
        pollTimer = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden')
                return;
            requestRefresh();
        }, POLL_INTERVAL_MS);
    };
    const applyOperation = async (operation, success) => {
        if (state.getSnapshot().busy)
            return false;
        begin();
        try {
            await operation();
            succeed(success);
            requestRefresh();
            return true;
        }
        catch (error) {
            fail(error);
            return false;
        }
        finally {
            end();
        }
    };
    disposers.push(upstream.subscribe(() => {
        patch((draft) => { draft.upstream = upstream.snapshot(); });
    }));
    disposers.push(own.subscribe(() => {
        patch((draft) => { draft.own = own.snapshot(); });
    }));
    const onReset = () => {
        requestRefresh();
        openStream();
    };
    disposers.push(ctx.on('connection/reset', onReset));
    const onVisibility = () => {
        if (document.visibilityState === 'visible')
            requestRefresh();
    };
    if (typeof document !== 'undefined')
        document.addEventListener('visibilitychange', onVisibility);
    disposers.push(() => {
        if (typeof document !== 'undefined')
            document.removeEventListener('visibilitychange', onVisibility);
    });
    openStream();
    requestRefresh();
    startPolling();
    const store = {
        state,
        selectProject: (projectPath) => {
            patch((draft) => { draft.projectPath = projectPath; });
            requestRefresh();
        },
        refresh: requestRefresh,
        notify: (text, tone = 'success') => {
            patch((draft) => { draft.notice = { tone, text }; });
        },
        clearNotice: () => {
            patch((draft) => { draft.notice = undefined; });
        },
        upsertServer: request => applyOperation(async () => { await api.upsertServer({ scope: request.scope, server: request.server, ...currentProject(state) }); }, t('notice.saved', { name: request.server.id })),
        removeServer: row => {
            if (row.kind === 'entry')
                return store.removeEntry(row.name);
            return applyOperation(async () => { await api.removeServer({ id: row.name, ...currentProject(state) }); }, t('notice.deleted', { name: row.name }));
        },
        setEnabled: (row, enabled) => {
            if (row.kind === 'entry')
                return store.setEntryEnabled(row.name, enabled);
            return applyOperation(async () => { await api.setServerEnabled({ id: row.name, enabled, ...currentProject(state) }); }, t(enabled ? 'notice.enabled' : 'notice.disabled', { name: row.name }));
        },
        restart: name => applyOperation(async () => {
            const result = await ctx.remote.mcpManager.restart(name);
            if (!result.ok)
                throw new Error(remoteErrorText(result));
        }, t('notice.restarted', { name })),
        probe: async (name) => {
            const remote = ctx.remote.mcpManager;
            const controller = new AbortController();
            const timer = setTimeout(() => { controller.abort(); }, 20_000);
            try {
                const result = await remote.probe(name, controller.signal);
                if (!result.ok || result.value === undefined) {
                    patch((draft) => { draft.notice = { tone: 'error', text: t('notice.probeFailed', { name }) }; });
                    return { ok: false, message: remoteErrorText(result) };
                }
                patch((draft) => {
                    draft.notice = result.value?.ok === true
                        ? { tone: 'success', text: t('notice.probeOk', { name }) }
                        : { tone: 'error', text: t('notice.probeFailed', { name }) };
                });
                return { ok: true, result: result.value };
            }
            catch (error) {
                fail(error);
                return { ok: false, message: errorMessage(error) };
            }
            finally {
                clearTimeout(timer);
            }
        },
        authorize: async (name) => {
            begin();
            try {
                const result = await api.authorize({ name });
                patch((draft) => { draft.notice = { tone: 'success', text: t('notice.authorized') }; });
                requestRefresh();
                return result;
            }
            catch (error) {
                fail(error);
                return undefined;
            }
            finally {
                end();
            }
        },
        cancelAuthorization: (name, id) => applyOperation(async () => { await api.cancelAuthorization({ name, id }); }, t('notice.authorized')),
        signOut: name => applyOperation(async () => { await api.signOut({ name }); }, t('notice.signedOut', { name })),
        saveEntry: (name, entry) => applyOperation(async () => { if (!(await upstream.setServer(name, entry)))
            throw new Error(t('editor.conflict')); }, t('notice.saved', { name })),
        removeEntry: name => applyOperation(async () => { if (!(await upstream.removeServer(name)))
            throw new Error(t('editor.conflict')); }, t('notice.deleted', { name })),
        setEntryEnabled: (name, enabled) => applyOperation(async () => { if (!(await upstream.setEnabled(name, enabled)))
            throw new Error(t('editor.conflict')); }, t(enabled ? 'notice.enabled' : 'notice.disabled', { name })),
        setToolEnabled: (server, tool, enabled) => {
            const current = state.getSnapshot().own.value?.disabledTools?.[server] ?? [];
            const next = enabled ? current.filter(name => name !== tool) : [...new Set([...current, tool])];
            begin();
            try {
                return own.setDisabledTools(server, next).then((accepted) => {
                    if (accepted)
                        requestRefresh();
                    return accepted;
                }, () => false).finally(() => { end(); });
            }
            catch {
                end();
                return Promise.resolve(false);
            }
        },
        dispose: () => {
            if (disposed)
                return;
            disposed = true;
            if (pollTimer !== undefined)
                clearInterval(pollTimer);
            pollTimer = undefined;
            for (const dispose of disposers.splice(0))
                dispose();
            disposeStream();
            void observing;
        },
    };
    return store;
}
/** The project target every file write carries, or nothing when none is selected. */
function currentProject(state) {
    const projectPath = state.getSnapshot().projectPath;
    return projectPath === undefined ? {} : { projectPath };
}
function remoteErrorText(result) {
    const error = result.error;
    if (error === undefined)
        return 'remote call failed';
    return error.message ?? error.code ?? 'remote call failed';
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=manager-store.js.map