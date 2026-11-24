/**
 * The two official shared settings forms this page writes through.
 *
 * `mcp-manager` owns the official server entries; `dsh-mcp-manager` is this
 * plugin's own entry and holds the per-server disabled tool names. Both are
 * volatile, revision-checked documents managed by the Host, so the page never
 * posts a private configuration protocol for them.
 */
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import { MCP_MANAGER_NAMESPACE, MCP_UPSTREAM_NAMESPACE } from '../types.ts';
import type { EntryServer, UpstreamConfig } from './summary.ts';
/** A form value plus the write gates the page renders. */
export interface FormState<T> {
    readonly status: 'loading' | 'ready' | 'unavailable';
    readonly value?: T;
    readonly revision?: number;
    readonly writable: boolean;
}
/** Write helpers over the official `mcp-manager.servers` map. */
export interface UpstreamFormFace {
    readonly namespace: typeof MCP_UPSTREAM_NAMESPACE;
    snapshot(): FormState<UpstreamConfig>;
    subscribe(listener: () => void): () => void;
    /** Replace one entry; unknown fields of the stored entry are preserved by the caller. */
    setServer(name: string, entry: EntryServer): Promise<boolean>;
    removeServer(name: string): Promise<boolean>;
    setEnabled(name: string, enabled: boolean): Promise<boolean>;
}
/** Write helpers over this plugin's own `disabledTools` map. */
export interface OwnFormFace {
    readonly namespace: typeof MCP_MANAGER_NAMESPACE;
    snapshot(): FormState<{
        disabledTools?: Record<string, string[]>;
    }>;
    subscribe(listener: () => void): () => void;
    /** Replace one server's disabled tool list; an empty list removes the key. */
    setDisabledTools(server: string, names: readonly string[]): Promise<boolean>;
}
/**
 * Build the writer for the official `mcp-manager` entry.
 * @param form - the shared form for that entry id.
 * @returns the page's upstream form face.
 */
export declare function createUpstreamForm(form: ConfigForm<UpstreamConfig>): UpstreamFormFace;
/**
 * Build the writer for this plugin's own entry.
 * @param form - the shared form for the `dsh-mcp-manager` entry id.
 * @returns the page's own form face.
 */
export declare function createOwnForm(form: ConfigForm<{
    disabledTools?: Record<string, string[]>;
}>): OwnFormFace;
//# sourceMappingURL=entry-form.d.ts.map