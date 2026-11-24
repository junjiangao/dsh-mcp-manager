/** Typed browser wrapper over the authenticated Host Connection RPC channel. */

import type { Context } from '@deepseek-ai/cordis'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import {
  isRpcResult, MCP_MANAGER_API_CHANNEL, MCP_MANAGER_ENDPOINT_PREFIX, type AuthorizationResult, type AuthorizeRequest,
  type CancelAuthorizationRequest, type ManagerRpcEndpoint, type RemoveServerRequest, type RpcError, type SetServerEnabledRequest,
  type SignOutRequest, type Snapshot, type SnapshotRequest, type UpsertServerRequest,
} from '../types.ts'

export class McpManagerRpcError extends Error {
  readonly code: RpcError['code']

  constructor(error: RpcError) {
    super(error.message)
    this.name = 'McpManagerRpcError'
    this.code = error.code
  }
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
  snapshot(request?: SnapshotRequest, signal?: AbortSignal): Promise<Snapshot>
  upsertServer(request: UpsertServerRequest, signal?: AbortSignal): Promise<Snapshot>
  removeServer(request: RemoveServerRequest, signal?: AbortSignal): Promise<Snapshot>
  setServerEnabled(request: SetServerEnabledRequest, signal?: AbortSignal): Promise<Snapshot>
  authorize(request: AuthorizeRequest, signal?: AbortSignal): Promise<AuthorizationResult>
  cancelAuthorization(request: CancelAuthorizationRequest, signal?: AbortSignal): Promise<null>
  signOut(request: SignOutRequest, signal?: AbortSignal): Promise<null>
}

export function createManagerApi(ctx: Context): ManagerClientApi {
  const rpc = ctx.get('connection').rpc as ClientConnectionRpc
  const call = async <T>(endpoint: ManagerRpcEndpoint, payload: unknown, signal?: AbortSignal): Promise<T> => {
    // The channel grammar admits a single path segment, so the manager prefix
    // rides inside the endpoint: `/api` + `mcp-manager/<endpoint>`.
    const result: unknown = await rpc.call(
      MCP_MANAGER_API_CHANNEL,
      `${MCP_MANAGER_ENDPOINT_PREFIX}/${endpoint}`,
      payload,
      signal,
    )
    if (!isRpcResult<T>(result)) throw new Error('MCP manager returned an invalid RPC response')
    if (!result.ok) throw new McpManagerRpcError(result.error)
    return result.value
  }
  return {
    snapshot: (request = {}, signal) => call<Snapshot>('snapshot', request, signal),
    upsertServer: (request, signal) => call<Snapshot>('upsertServer', request, signal),
    removeServer: (request, signal) => call<Snapshot>('removeServer', request, signal),
    setServerEnabled: (request, signal) => call<Snapshot>('setServerEnabled', request, signal),
    authorize: (request, signal) => call<AuthorizationResult>('authorize', request, signal),
    cancelAuthorization: (request, signal) => call<null>('cancelAuthorization', request, signal),
    signOut: (request, signal) => call<null>('signOut', request, signal),
  }
}
