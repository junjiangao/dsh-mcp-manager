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
import type { Context } from '@deepseek-ai/cordis';
import type { McpManagedServerView } from '@deepseek-ai/dsh-mcp-manager';
import type { McpProbeResult } from '@deepseek-ai/dsh-mcp-client/types';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { AuthorizationResult, McpScope, ServerPatch, Snapshot } from '../types.ts';
import type { ManagerClientApi } from './api.ts';
import type { FormState, OwnFormFace, UpstreamFormFace } from './entry-form.ts';
import type { EntryServer, ServerSummary, UpstreamConfig } from './summary.ts';
import type { McpLocaleKey } from './locales.ts';
export interface ManagerNotice {
    readonly tone: 'success' | 'error';
    readonly text: string;
}
/**
 * Everything the page renders, plus the state its operations own.
 *
 * The fields are mutable because `SnapshotStore.update` hands the mutator this
 * exact type; the store freezes every published snapshot, so nothing outside a
 * mutator can write one.
 */
export interface ManagerView {
    status: 'loading' | 'ready' | 'error';
    snapshot: Snapshot | undefined;
    /** The first read's failure, while no snapshot stands. */
    error: string | undefined;
    /** A background read failed; a standing snapshot keeps serving. */
    pollFailed: boolean;
    /** A user operation is crossing the wire. */
    busy: boolean;
    /** The last operation's refusal, or a success confirmation (already translated by the caller). */
    notice: ManagerNotice | undefined;
    /** The official manager's live list, or the last list received. */
    managed: readonly McpManagedServerView[];
    /** The status stream's carrier failed; the page keeps the last list. */
    streamFailed: boolean;
    /** The official `mcp-manager` entry form. */
    upstream: FormState<UpstreamConfig>;
    /** This plugin's own entry form (`disabledTools`). */
    own: FormState<{
        disabledTools?: Record<string, string[]>;
    }>;
    /** Registered workspace root the project scope reads and writes. */
    projectPath: string | undefined;
    /** Last successful read, epoch milliseconds. */
    updatedAt: number | undefined;
}
export interface ManagerStore {
    readonly state: SnapshotStore<ManagerView>;
    selectProject(projectPath: string | undefined): void;
    refresh(): void;
    notify(text: string, tone?: ManagerNotice['tone']): void;
    clearNotice(): void;
    upsertServer(request: {
        readonly scope: McpScope;
        readonly server: ServerPatch;
    }): Promise<boolean>;
    removeServer(row: ServerSummary): Promise<boolean>;
    setEnabled(row: ServerSummary, enabled: boolean): Promise<boolean>;
    restart(name: string): Promise<boolean>;
    probe(name: string): Promise<{
        readonly ok: true;
        readonly result: McpProbeResult;
    } | {
        readonly ok: false;
        readonly message: string;
    }>;
    authorize(name: string): Promise<AuthorizationResult | undefined>;
    cancelAuthorization(name: string, id: string): Promise<boolean>;
    signOut(name: string): Promise<boolean>;
    saveEntry(name: string, entry: EntryServer): Promise<boolean>;
    removeEntry(name: string): Promise<boolean>;
    setEntryEnabled(name: string, enabled: boolean): Promise<boolean>;
    setToolEnabled(server: string, tool: string, enabled: boolean): Promise<boolean>;
    dispose(): void;
}
/**
 * Create the store and start its read loop.
 * @param ctx - the browser plugin context (connection, remote, forms).
 * @param api - the Host RPC face.
 * @param upstream - the official entry form face.
 * @param own - this plugin's entry form face.
 * @param translate - the page translator, used for notices.
 */
export declare function createManagerStore(ctx: Context, api: ManagerClientApi, upstream: UpstreamFormFace, own: OwnFormFace, translate: (key: McpLocaleKey, params?: Record<string, unknown>) => string): ManagerStore;
//# sourceMappingURL=manager-store.d.ts.map