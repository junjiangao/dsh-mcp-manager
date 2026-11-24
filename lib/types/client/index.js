/** Browser entry for Settings → MCP. */
import { en, zh } from "./locales.js";
import { createManagerApi } from "./api.js";
import { createOwnForm, createUpstreamForm } from "./entry-form.js";
import { createManagerStore } from "./manager-store.js";
import { McpSection } from "./McpSection.js";
import { MCP_MANAGER_NAMESPACE, MCP_UPSTREAM_NAMESPACE } from "../types.js";
export const NS = 'settings.mcpManager';
/**
 * `remote.mcpManager` carries the official live status stream, restart, and
 * probe. `configForms` carries the two official entry forms: the upstream
 * `mcp-manager` entry and this plugin's own entry. `connection` carries the
 * file-scope RPC and the Host-only OAuth operations.
 */
export const inject = ['connection', 'remote', 'remote.mcpManager', 'slots', 'locale', 'configForms'];
export function apply(ctx) {
    const t = ctx.locale.bind(NS);
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-mcp-manager: dictionaries');
    const api = createManagerApi(ctx);
    const upstream = createUpstreamForm(ctx.configForms.get(MCP_UPSTREAM_NAMESPACE));
    const own = createOwnForm(ctx.configForms.get(MCP_MANAGER_NAMESPACE));
    const store = createManagerStore(ctx, api, upstream, own, t);
    ctx.effect(() => () => store.dispose(), 'dsh-mcp-manager: store');
    const injected = () => ({ store });
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'mcp',
        order: 20,
        label: () => t('title'),
        locale: NS,
        inject: injected,
    }, McpSection));
}
export { McpSection };
//# sourceMappingURL=index.js.map