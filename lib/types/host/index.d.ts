/** Host entry for the MCP manager plugin. */
import type { Context } from '@deepseek-ai/cordis';
import { McpManagerController } from './controller.ts';
import type { ManagerSettings } from '../settings.ts';
export declare const name = "@junjiangao/dsh-mcp-manager";
/**
 * The Loader entry's config schema. dsh renders this on the settings page and
 * hands the resolved refs to {@link apply}; the panel writes it back through
 * `ctx.configForms` against this same entry id.
 */
export { Config } from '../settings.ts';
/**
 * `mcpManager` is a hard dependency: without the official manager there is no
 * fleet to manage, so the plugin must not load (README documents the
 * `dsh-web-app` composition requirement). `connection` is the authenticated
 * carrier for the file-scope RPC and the Host-only OAuth operations.
 */
export declare const inject: string[];
/**
 * Start the controller on the Host Cordis fiber.
 * @param ctx - the Host plugin context.
 * @param config - the entry's resolved volatile refs.
 */
export declare function apply(ctx: Context, config: ManagerSettings): Promise<void>;
export { McpManagerController };
//# sourceMappingURL=index.d.ts.map