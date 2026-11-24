/** The editor's form model: strings in, a validated patch or entry out. */
import type { McpScope, ServerPatch, ServerTransport, ToolLoading } from '../types.ts';
import type { EntryServer, MapRow, ServerSummary } from './summary.ts';
export type DraftTarget = 'entry' | McpScope;
export interface DraftRow {
    key: string;
    value: string;
    /** Store the value as sensitive (file targets only). */
    secret: boolean;
    /** A value exists on disk but the browser only sees its masked projection. */
    configured: boolean;
}
export interface ServerDraft {
    target: DraftTarget;
    name: string;
    enabled: boolean;
    transport: ServerTransport;
    command: string;
    args: string[];
    cwd: string;
    url: string;
    env: DraftRow[];
    headers: DraftRow[];
    toolCallTimeoutMs: string;
    startupTimeoutMs: string;
    closeTimeoutMs: string;
    reconnectEnabled: boolean;
    reconnectInitial: string;
    reconnectMax: string;
    reconnectAttempts: string;
    toolLoading: ToolLoading;
    oauthEnabled: boolean;
    oauthCredentialKey: string;
    oauthClientId: string;
    oauthScope: string;
    oauthRequestTimeout: string;
    oauthAuthorizationTimeout: string;
}
export type DraftIssue = 'name' | 'command' | 'url' | 'timeout' | 'envKey' | 'credential' | 'oauthKey' | 'reconnect';
/**
 * Build an editing draft.
 * @param row - the server to edit, or `undefined` for a new one.
 * @param defaultTarget - where a new server is written when the official form is unavailable.
 * @returns the draft.
 */
export declare function createDraft(row: ServerSummary | undefined, defaultTarget?: DraftTarget): ServerDraft;
/** Field-level issues in display order; empty means the draft is writable. */
export declare function validateDraft(draft: ServerDraft): DraftIssue[];
/** Whether the target writes to the official manager's entry form. */
export declare function isEntryTarget(target: DraftTarget): target is 'entry';
/** The scope a file target writes to. */
export declare function scopeOf(target: DraftTarget): McpScope;
/**
 * Build the RPC patch for a file target.
 * @param draft - a draft that passed {@link validateDraft}.
 * @returns the patch, with masked secrets marked keep and untouched rows omitted.
 */
export declare function patchFromDraft(draft: ServerDraft): ServerPatch;
/**
 * Build a complete official manager entry for an entry target.
 * @param draft - a draft that passed {@link validateDraft}.
 * @returns the entry; transport-specific fields of the other transport are absent.
 */
export declare function entryFromDraft(draft: ServerDraft): EntryServer;
/** Seed a row from an existing map row, keeping its stored markers. */
export declare function rowFromMap(row: MapRow): DraftRow;
/** The locale key explaining one issue. */
export declare function issueKey(issue: DraftIssue): string;
//# sourceMappingURL=draft.d.ts.map