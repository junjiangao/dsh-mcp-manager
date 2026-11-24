/** Shared JSON-safe contracts for the Host RPC and the browser panel. */
/**
 * Shared channel carrying the manager's authenticated RPC.
 *
 * The manager rides the Connection service's own `/api` channel instead of
 * claiming a private prefix route:
 *
 * - The physical `/api` route is mounted by `@deepseek-ai/dsh-client-connection`
 *   itself and applies the Host/Origin fence plus browser authentication before
 *   anything reaches a handler, so this plugin never repeats that logic.
 * - `connection.rpc.handle(channel, …)` cannot be used: its `register()` mounts
 *   the physical route through `owner.webServer` where `owner` is the Connection
 *   service's own Context, which fails with `cannot get property "webServer"
 *   without inject`.
 * - `connection.rpc.intercept('/api', …)` cannot be used either: the shared
 *   channel accepts exactly one interceptor and `@deepseek-ai/dsh-api-gateway`
 *   already owns it.
 * - `connection.fetch.register()` is therefore the supported path: one exact
 *   Fetch route per endpoint, taking precedence over the interceptor.
 */
export const MCP_MANAGER_API_CHANNEL = '/api';
/** Endpoint prefix this plugin owns inside the shared channel. */
export const MCP_MANAGER_ENDPOINT_PREFIX = 'mcp-manager';
/**
 * Every manager endpoint, in registration order.
 *
 * The `mcp.json` file scopes are written through this private protocol because
 * no shared service owns those files. Everything the official MCP manager
 * already governs is **not** mirrored here: live status and restart/probe go
 * through `ctx.remote.mcpManager`, configuration of the official
 * `mcp-manager` entry goes through the shared settings form
 * (`ctx.configForms`), and the per-tool policy of this plugin goes through its
 * own entry form. The three authorization endpoints exist because the official
 * manager exposes `startAuthorization` / `cancelAuthorization` / `signOut` on
 * the Host only; they name a server the manager already lists and add no write
 * path of their own.
 */
export const MCP_MANAGER_ENDPOINTS = [
    'snapshot',
    'upsertServer',
    'removeServer',
    'setServerEnabled',
    'authorize',
    'cancelAuthorization',
    'signOut',
];
/** The Loader entry id this plugin's Host half is mounted under, and its settings namespace. */
export const MCP_MANAGER_NAMESPACE = 'dsh-mcp-manager';
/**
 * The official MCP manager's Loader entry id in the `dsh-web-app` composition.
 * It is the settings namespace the panel writes `servers` through.
 */
export const MCP_UPSTREAM_NAMESPACE = 'mcp-manager';
/**
 * Absolute exact Fetch-route path for one endpoint.
 *
 * The browser client posts to `<channel>/<endpoint>`, its channel grammar
 * (`/^\/[A-Za-z0-9._~-]+$/`) admits a single segment only, so the channel is
 * `/api` and the endpoint string carries the `mcp-manager/` prefix.
 * @param endpoint - one manager endpoint name.
 * @returns the path registered through `connection.fetch.register()`.
 */
export function mcpManagerRoutePath(endpoint) {
    return `${MCP_MANAGER_API_CHANNEL}/${MCP_MANAGER_ENDPOINT_PREFIX}/${endpoint}`;
}
/** Every `mcp.json` scope this plugin owns, in precedence order. */
export const MCP_SCOPES = ['project', 'profile', 'user'];
export function isRpcResult(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const record = value;
    if (record.ok === true)
        return 'value' in record;
    if (record.ok !== false || typeof record.error !== 'object' || record.error === null)
        return false;
    const error = record.error;
    return typeof error.code === 'string' && typeof error.message === 'string';
}
/** 插件的社区注册身份(GitHub owner/repo)。 */
export const PLUGIN_IDENTITY = 'junjiangao/dsh-mcp-manager';
/** 插件安装后的 npm 包名 / loader 模块名(bundle 层与 patch 条目 name)。 */
export const PLUGIN_MODULE_NAME = '@junjiangao/dsh-mcp-manager';
//# sourceMappingURL=types.js.map