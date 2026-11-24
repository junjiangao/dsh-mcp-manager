/**
 * The two official shared settings forms this page writes through.
 *
 * `mcp-manager` owns the official server entries; `dsh-mcp-manager` is this
 * plugin's own entry and holds the per-server disabled tool names. Both are
 * volatile, revision-checked documents managed by the Host, so the page never
 * posts a private configuration protocol for them.
 */
import { MCP_MANAGER_NAMESPACE, MCP_UPSTREAM_NAMESPACE } from "../types.js";
/**
 * Build the writer for the official `mcp-manager` entry.
 * @param form - the shared form for that entry id.
 * @returns the page's upstream form face.
 */
export function createUpstreamForm(form) {
    return {
        namespace: MCP_UPSTREAM_NAMESPACE,
        snapshot: () => {
            const snapshot = form.getSnapshot();
            return {
                status: snapshot.status,
                writable: snapshot.writable,
                ...snapshot.value === undefined ? {} : { value: snapshot.value },
                ...snapshot.revision === undefined ? {} : { revision: snapshot.revision },
            };
        },
        subscribe: listener => form.subscribe(listener),
        setServer: (name, entry) => form.mutate([{ op: 'set', path: ['servers', name], value: entry }]),
        removeServer: name => form.mutate([{ op: 'unset', path: ['servers', name] }]),
        setEnabled: (name, enabled) => {
            const current = form.getSnapshot().value?.servers?.[name];
            if (current === undefined)
                return Promise.resolve(false);
            return form.mutate([{ op: 'set', path: ['servers', name], value: { ...current, enabled } }]);
        },
    };
}
/**
 * Build the writer for this plugin's own entry.
 * @param form - the shared form for the `dsh-mcp-manager` entry id.
 * @returns the page's own form face.
 */
export function createOwnForm(form) {
    return {
        namespace: MCP_MANAGER_NAMESPACE,
        snapshot: () => {
            const snapshot = form.getSnapshot();
            return {
                status: snapshot.status,
                writable: snapshot.writable,
                ...snapshot.value === undefined ? {} : { value: snapshot.value },
                ...snapshot.revision === undefined ? {} : { revision: snapshot.revision },
            };
        },
        subscribe: listener => form.subscribe(listener),
        setDisabledTools: (server, names) => names.length === 0
            ? form.mutate([{ op: 'unset', path: ['disabledTools', server] }])
            : form.mutate([{ op: 'set', path: ['disabledTools', server], value: [...names] }]),
    };
}
//# sourceMappingURL=entry-form.js.map