/**
 * Server defaults and shape validation shared by the Host, the browser panel,
 * and the `mcp.json` codec.
 *
 * The official `@deepseek-ai/dsh-mcp-client` validates the final connection
 * configuration again (and the manager's registration path runs that
 * validation); this module covers the fields the panel edits before a write,
 * so a bad entry is rejected at the editor instead of surfacing as a failed
 * registration. It imports nothing at runtime, so the client bundle can use it.
 */
import type { OAuthPolicy, ReconnectPolicy, ServerTransport, StoredServer, ToolLoading } from './types.ts';
/**
 * Largest delay Node schedules without clamping it to one millisecond.
 *
 * Same value as `@deepseek-ai/dsh-timeout`'s `MAX_TIMER_DELAY_MS`, inlined so
 * this plugin does not carry a peer dependency for one constant.
 */
export declare const MAX_TIMER_DELAY_MS = 2147483647;
export declare const DEFAULT_TOOL_CALL_TIMEOUT_MS = 60000;
/** The official manager's `startupTimeoutMs` default. */
export declare const DEFAULT_STARTUP_TIMEOUT_MS = 30000;
/** The official client's `closeTimeoutMs` default. */
export declare const DEFAULT_CLOSE_TIMEOUT_MS = 5000;
export declare const DEFAULT_OAUTH_REQUEST_TIMEOUT_MS = 10000;
export declare const DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS = 600000;
/** `mcp-client` reconnect defaults, kept equal to the official `RECONNECT_DEFAULTS`. */
export declare const DEFAULT_RECONNECT: ReconnectPolicy;
/** `serverName` grammar in `mcp.json` and in the official manager; also the tool namespace. */
export declare const SERVER_ID_PATTERN = "[-A-Za-z0-9_]{1,32}";
/** The `mcp-client` credential scope the manager requires for OAuth entries. */
export declare const CREDENTIAL_KEY_PATTERN: RegExp;
/** Whether a stored value is still an unresolved environment template. */
export declare function isTemplatedValue(value: string): boolean;
/** Whether a stored value references the official credential store. */
export declare function isCredentialTemplate(value: string): boolean;
export declare function defaultServer(id: string): StoredServer;
export declare function validateServerId(id: string): void;
export declare function transportOf(value: string): ServerTransport;
/** Validate one complete stored server.
 * @param server - the entry to validate.
 * @throws TypeError for a malformed shape, Error for a rejected value.
 */
export declare function validateServerConfig(server: StoredServer): void;
/** Validate one OAuth policy for a server.
 * @param id - server name, for messages.
 * @param transport - the server transport; OAuth requires `streamable-http`.
 * @param oauth - the policy to validate.
 */
export declare function validateOAuthPolicy(id: string, transport: ServerTransport, oauth: OAuthPolicy): void;
export declare function validateReconnect(value: ReconnectPolicy): void;
export declare function isToolLoading(value: unknown): value is ToolLoading;
//# sourceMappingURL=server-config.d.ts.map