/** Merge the three data sources (file snapshot, official manager stream, entry form) into one row model. */
import { DEFAULT_CLOSE_TIMEOUT_MS, DEFAULT_RECONNECT, DEFAULT_STARTUP_TIMEOUT_MS, DEFAULT_TOOL_CALL_TIMEOUT_MS } from "../server-config.js";
/**
 * Merge every source into panel rows.
 * @param snapshot - the Host's file view, or `undefined` while loading.
 * @param managed - the official manager's status stream.
 * @param entryServers - `mcp-manager.servers` values from the shared form.
 * @param disabledTools - this plugin's per-server disabled tool names.
 * @param entryWritable - whether the official form accepts writes.
 * @returns entry servers first, then file servers, each sorted by name.
 */
export function buildSummaries(snapshot, managed, entryServers, disabledTools, entryWritable) {
    const runtimes = new Map(managed.map(view => [view.name, view]));
    const fileServers = snapshot?.servers ?? [];
    const toolsByServer = new Map();
    for (const tool of snapshot?.tools ?? []) {
        const list = toolsByServer.get(tool.serverId) ?? [];
        list.push(tool);
        toolsByServer.set(tool.serverId, list);
    }
    const fileNames = new Set(fileServers.map(server => server.id));
    const entryNames = new Set(Object.keys(entryServers));
    const rows = [];
    for (const name of [...entryNames].sort((left, right) => left.localeCompare(right))) {
        const entry = entryServers[name] ?? {};
        rows.push(entrySummary(name, entry, runtimes.get(name), toolsByServer.get(name) ?? [], disabledTools[name] ?? [], entryWritable, fileNames.has(name)));
    }
    for (const server of fileServers) {
        rows.push(fileSummary(server, runtimes.get(server.id), toolsByServer.get(server.id) ?? [], disabledTools[server.id] ?? [], entryNames.has(server.id)));
    }
    return rows;
}
function entrySummary(name, entry, runtime, tools, disabled, writable, conflict) {
    const transport = entry.transport === 'streamable-http' ? 'streamable-http' : 'stdio';
    return {
        name,
        kind: 'entry',
        label: name,
        enabled: entry.enabled !== false,
        transport,
        writable,
        compat: false,
        shadowed: [],
        command: entry.command ?? '',
        args: [...entry.args ?? []],
        cwd: entry.cwd ?? '',
        url: entry.url ?? '',
        env: mapRows(entry.env),
        headers: mapRows(entry.headers),
        toolCallTimeoutMs: entry.toolCallTimeoutMs ?? DEFAULT_TOOL_CALL_TIMEOUT_MS,
        startupTimeoutMs: entry.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS,
        closeTimeoutMs: entry.closeTimeoutMs ?? DEFAULT_CLOSE_TIMEOUT_MS,
        reconnect: { ...DEFAULT_RECONNECT, ...entry.reconnect },
        toolLoading: entry.toolLoading === 'on-demand' ? 'on-demand' : 'eager',
        ...entry.oauth === undefined ? {} : { oauth: entry.oauth },
        ...runtime === undefined ? {} : { runtime },
        tools,
        disabledTools: disabled,
        entry,
        conflict,
    };
}
function fileSummary(server, runtime, tools, disabled, conflict) {
    return {
        name: server.id,
        kind: 'file',
        label: server.label,
        enabled: server.enabled,
        transport: server.transport,
        scope: server.scope,
        path: server.path,
        writable: server.writable,
        compat: server.scope === 'project' && server.writable === false,
        shadowed: server.shadowed,
        command: server.command,
        args: [...server.args],
        cwd: server.cwd,
        url: server.url,
        env: secretRows(server.env),
        headers: secretRows(server.headers),
        toolCallTimeoutMs: server.toolCallTimeoutMs,
        startupTimeoutMs: server.startupTimeoutMs,
        closeTimeoutMs: server.closeTimeoutMs,
        reconnect: { ...server.reconnect },
        toolLoading: server.toolLoading,
        ...server.oauth === undefined ? {} : { oauth: server.oauth },
        templates: server.templates,
        registration: server.registration,
        ...runtime === undefined ? {} : { runtime },
        tools,
        disabledTools: disabled,
        file: server,
        conflict,
    };
}
function mapRows(values) {
    return Object.entries(values ?? {}).map(([key, value]) => ({ key, value }));
}
function secretRows(values) {
    return Object.entries(values).map(([key, state]) => ({ key, state }));
}
/** The status bucket a row belongs to, for the status filter. */
export function statusBucket(runtime) {
    const state = runtime?.status.state;
    if (state === 'connected')
        return 'connected';
    if (state === 'connecting' || state === 'reconnecting')
        return 'busy';
    if (state === 'waiting-credentials' || state === 'waiting-authorization' || state === 'failed')
        return 'attention';
    if (state === 'disabled')
        return 'disabled';
    return 'unknown';
}
/** Filter rows by search text, source, and status bucket. */
export function filterSummaries(rows, query, source, status) {
    const needle = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
        if (source !== 'all' && row.kind !== source)
            return false;
        if (status !== 'all' && statusBucket(row.runtime) !== status)
            return false;
        if (needle === '')
            return true;
        const haystack = [
            row.name, row.label, row.command, row.url, row.cwd, ...row.args,
            ...row.env.map(entry => entry.key), ...row.headers.map(entry => entry.key),
            ...row.tools.map(tool => `${tool.name} ${tool.description}`),
            row.scope ?? '',
        ].join('\n').toLocaleLowerCase();
        return haystack.includes(needle);
    });
}
/**
 * Serialize one row as the `mcp.json` entry it would be written as, for the copy action.
 * @param row - the row to render.
 * @returns pretty-printed JSON.
 */
export function rowToJson(row) {
    const entry = { type: row.transport === 'stdio' ? 'stdio' : 'http' };
    if (row.transport === 'stdio') {
        entry.command = row.command;
        entry.args = [...row.args];
        if (row.cwd !== '')
            entry.cwd = row.cwd;
        if (row.env.length > 0)
            entry.env = Object.fromEntries(row.env.map(item => [item.key, item.value ?? '']));
    }
    else {
        entry.url = row.url;
        if (row.headers.length > 0)
            entry.headers = Object.fromEntries(row.headers.map(item => [item.key, item.value ?? '']));
    }
    if (!row.enabled)
        entry.enabled = false;
    if (row.toolLoading !== 'eager')
        entry.toolLoading = row.toolLoading;
    if (row.oauth !== undefined)
        entry.oauth = { ...row.oauth };
    return `${JSON.stringify(entry, null, 2)}\n`;
}
//# sourceMappingURL=summary.js.map