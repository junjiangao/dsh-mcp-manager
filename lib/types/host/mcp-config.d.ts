/**
 * Adapter between this plugin's stored server shape and the official MCP
 * manager's registration entry, plus the schema-backed validation that keeps a
 * bad file entry from reaching `ctx.mcpManager.register()`.
 */
import type { McpServerRegistration } from '@deepseek-ai/dsh-mcp-manager';
import type { StoredServer } from '../types.ts';
/**
 * Project one stored server into the manager's registration entry.
 *
 * The manager forces `expandTemplates: true` and `failOnStartupError: false`
 * itself; repeating them here keeps the entry self-describing and makes the
 * validation candidate identical to what the manager builds.
 * @param server - the stored server, environment templates already expanded.
 * @returns the registration entry; `enabled` is deliberately absent.
 */
export declare function toRegistration(server: StoredServer): McpServerRegistration;
/**
 * Validate one server with the official client's own schema.
 *
 * This is the same schema the manager runs when the entry is registered, so a
 * mismatch surfaces in the panel before the file is written (or at least
 * before the server silently fails to load).
 * @param server - the stored server.
 * @throws Error carrying `code: 'MCP_CONFIG_VALIDATION'`.
 */
export declare function validateMcpConfig(server: StoredServer): void;
//# sourceMappingURL=mcp-config.d.ts.map