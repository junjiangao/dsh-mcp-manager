/** Host settings schema for this plugin's own Loader entry. */
import z from '@deepseek-ai/schemastery';
import { MCP_MANAGER_NAMESPACE } from "./types.js";
export const MANAGER_NAMESPACE = MCP_MANAGER_NAMESPACE;
/**
 * The Loader entry's schema, which is also the form the settings page renders.
 *
 * The `mcp.json` file scopes and the official `mcp-manager` configuration are
 * edited elsewhere; this entry owns one field only: the per-server list of
 * public tool names the panel disables. It is `volatile()` so a committed edit
 * reaches the running guard without re-registering the plugin.
 */
export const Config = z.object({
    disabledTools: z.dict(z.array(z.string())).default({}).volatile(),
});
/** The schema under its historical name; both refer to the same entry config. */
export const ManagerSettingsSchema = Config;
/** Validate the entry document before it is used.
 * @param value - per-server disabled tool names.
 * @throws TypeError for a malformed shape, Error for a rejected name.
 */
export function validateDisabledTools(value) {
    for (const [id, tools] of Object.entries(value)) {
        if (!/^[-A-Za-z0-9_]{1,32}$/.test(id))
            throw new Error(`disabledTools key ${JSON.stringify(id)} must be a server name`);
        if (!Array.isArray(tools) || tools.some(tool => typeof tool !== 'string' || tool.length === 0 || tool.length > 200)) {
            throw new Error(`disabledTools[${JSON.stringify(id)}] must be a list of tool names`);
        }
    }
}
//# sourceMappingURL=settings.js.map