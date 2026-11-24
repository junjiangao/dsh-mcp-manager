/** Merge the three data sources (file snapshot, official manager stream, entry form) into one row model. */
import type { McpManagedServerView } from '@deepseek-ai/dsh-mcp-manager';
import type { ManagedServerView, ManagedToolView, McpScope, OAuthPolicy, ReconnectPolicy, RegistrationView, SecretState, ServerTemplates, ServerTransport, Snapshot, ToolLoading } from '../types.ts';
/** One server as stored in the official `mcp-manager.servers` map; every field is optional. */
export interface EntryServer {
    transport?: ServerTransport;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    url?: string;
    headers?: Record<string, string>;
    enabled?: boolean;
    toolCallTimeoutMs?: number;
    startupTimeoutMs?: number;
    closeTimeoutMs?: number;
    reconnect?: Partial<ReconnectPolicy>;
    toolLoading?: ToolLoading;
    oauth?: OAuthPolicy;
}
/** The official manager's volatile configuration shape. */
export interface UpstreamConfig {
    servers?: Record<string, EntryServer>;
}
/** One environment/header row: a redacted file value or a visible entry value. */
export interface MapRow {
    readonly key: string;
    readonly value?: string;
    readonly state?: SecretState;
}
export interface ServerSummary {
    readonly name: string;
    readonly kind: 'entry' | 'file';
    readonly label: string;
    readonly enabled: boolean;
    readonly transport: ServerTransport;
    readonly scope?: McpScope;
    readonly path?: string;
    readonly writable: boolean;
    readonly compat: boolean;
    readonly shadowed: readonly McpScope[];
    readonly command: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly url: string;
    readonly env: readonly MapRow[];
    readonly headers: readonly MapRow[];
    readonly toolCallTimeoutMs: number;
    readonly startupTimeoutMs: number;
    readonly closeTimeoutMs: number;
    readonly reconnect: ReconnectPolicy;
    readonly toolLoading: ToolLoading;
    readonly oauth?: OAuthPolicy;
    readonly templates?: ServerTemplates;
    readonly registration?: RegistrationView;
    readonly runtime?: McpManagedServerView;
    readonly tools: readonly ManagedToolView[];
    readonly disabledTools: readonly string[];
    readonly entry?: EntryServer;
    readonly file?: ManagedServerView;
    /** The name exists both as an official config entry and in a file. */
    readonly conflict: boolean;
}
export type SourceFilter = 'all' | 'entry' | 'file';
export type StatusFilter = 'all' | 'connected' | 'busy' | 'attention' | 'disabled' | 'unknown';
/**
 * Merge every source into panel rows.
 * @param snapshot - the Host's file view, or `undefined` while loading.
 * @param managed - the official manager's status stream.
 * @param entryServers - `mcp-manager.servers` values from the shared form.
 * @param disabledTools - this plugin's per-server disabled tool names.
 * @param entryWritable - whether the official form accepts writes.
 * @returns entry servers first, then file servers, each sorted by name.
 */
export declare function buildSummaries(snapshot: Snapshot | undefined, managed: readonly McpManagedServerView[], entryServers: Readonly<Record<string, EntryServer>>, disabledTools: Readonly<Record<string, readonly string[]>>, entryWritable: boolean): ServerSummary[];
/** The status bucket a row belongs to, for the status filter. */
export declare function statusBucket(runtime: McpManagedServerView | undefined): Exclude<StatusFilter, 'all'>;
/** Filter rows by search text, source, and status bucket. */
export declare function filterSummaries(rows: readonly ServerSummary[], query: string, source: SourceFilter, status: StatusFilter): ServerSummary[];
/**
 * Serialize one row as the `mcp.json` entry it would be written as, for the copy action.
 * @param row - the row to render.
 * @returns pretty-printed JSON.
 */
export declare function rowToJson(row: ServerSummary): string;
//# sourceMappingURL=summary.d.ts.map