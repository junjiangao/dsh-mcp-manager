/** Typed browser wrapper over the authenticated Host Connection RPC channel. */
import type { Context } from '@deepseek-ai/cordis';
import { type AuthorizationResult, type AuthorizeRequest, type CancelAuthorizationRequest, type RemoveServerRequest, type RpcError, type SetServerEnabledRequest, type SignOutRequest, type Snapshot, type SnapshotRequest, type UpsertServerRequest } from '../types.ts';
export declare class McpManagerRpcError extends Error {
    readonly code: RpcError['code'];
    constructor(error: RpcError);
}
/**
 * The manager's own RPC covers exactly what no official service owns: the
 * `mcp.json` file scopes and the Host-only OAuth operations.
 *
 * Live status, restart, and probe are the official `mcpManager` Remote
 * methods; the official `mcp-manager` entry and this plugin's own entry are
 * edited through `ctx.configForms`. Nothing here duplicates those.
 */
export interface ManagerClientApi {
    snapshot(request?: SnapshotRequest, signal?: AbortSignal): Promise<Snapshot>;
    upsertServer(request: UpsertServerRequest, signal?: AbortSignal): Promise<Snapshot>;
    removeServer(request: RemoveServerRequest, signal?: AbortSignal): Promise<Snapshot>;
    setServerEnabled(request: SetServerEnabledRequest, signal?: AbortSignal): Promise<Snapshot>;
    authorize(request: AuthorizeRequest, signal?: AbortSignal): Promise<AuthorizationResult>;
    cancelAuthorization(request: CancelAuthorizationRequest, signal?: AbortSignal): Promise<null>;
    signOut(request: SignOutRequest, signal?: AbortSignal): Promise<null>;
}
export declare function createManagerApi(ctx: Context): ManagerClientApi;
//# sourceMappingURL=api.d.ts.map