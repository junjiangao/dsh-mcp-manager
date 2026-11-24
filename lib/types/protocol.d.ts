/** Runtime validation and redacted projections for the manager RPC. */
import type { AuthorizeRequest, CancelAuthorizationRequest, ManagedServerView, McpScope, RegistrationView, SecretState, ServerPatch, ServerTemplates, SetServerEnabledRequest, ScopeTarget, SignOutRequest, SnapshotRequest, StoredServer, UpsertServerRequest, WorkspaceView } from './types.ts';
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function asRecord(value: unknown, message: string): Record<string, unknown>;
export declare function asString(value: unknown, field: string): string;
export declare function asBoolean(value: unknown, field: string): boolean;
export declare function asNumber(value: unknown, field: string): number;
export declare function parseSnapshotRequest(value: unknown): SnapshotRequest;
export declare function parseUpsertRequest(value: unknown): UpsertServerRequest;
export declare function parseRemoveRequest(value: unknown): {
    id: string;
} & ScopeTarget;
export declare function parseSetEnabledRequest(value: unknown): SetServerEnabledRequest;
export declare function parseAuthorizeRequest(value: unknown): AuthorizeRequest;
export declare function parseCancelAuthorizationRequest(value: unknown): CancelAuthorizationRequest;
export declare function parseSignOutRequest(value: unknown): SignOutRequest;
/** Validate one server patch coming from the browser. */
export declare function parseServerPatch(record: Record<string, unknown>): ServerPatch;
/**
 * Apply one validated patch to a stored server.
 *
 * A transport change clears the fields that belong to the other transport, so
 * the result always passes {@link validateServerConfig}. `env`/`headers`
 * maps are full replacements: a key absent from the patch is removed.
 * @param current - the server as stored.
 * @param patch - the validated patch.
 * @returns a new server; the input is not mutated.
 */
export declare function applyServerPatch(current: StoredServer, patch: ServerPatch): StoredServer;
/**
 * Build one stored server from a fresh patch, applying defaults for absent fields.
 * @param patch - the validated patch; its `id` names the server.
 * @returns the server to write.
 */
export declare function serverFromPatch(patch: ServerPatch): StoredServer;
/** Secret-state projection: existence, masking intent, and template kind only. */
export declare function secretStates(values: Readonly<Record<string, string>>, sensitive: readonly string[]): Record<string, SecretState>;
/** Names one server keeps as templates, for panel display. */
export declare function templatesOf(server: StoredServer): ServerTemplates;
/**
 * Project one merged file server into the browser view.
 * @param sourced - the winning server plus its provenance.
 * @param registration - whether the Host registered it with the official manager.
 * @returns the redacted view.
 */
export declare function toServerView(sourced: {
    readonly id: string;
    readonly scope: McpScope;
    readonly path: string;
    readonly writable: boolean;
    readonly shadowed: readonly {
        readonly scope: McpScope;
    }[];
    readonly server: StoredServer;
}, registration: RegistrationView): ManagedServerView;
/** Redact the workspace registry for the panel. */
export declare function toWorkspaceViews(workspaces: readonly {
    id: string;
    path: string;
    title?: string;
}[]): WorkspaceView[];
//# sourceMappingURL=protocol.d.ts.map