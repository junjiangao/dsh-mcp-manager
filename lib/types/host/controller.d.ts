/**
 * Host-side orchestration for the MCP panel.
 *
 * This controller owns exactly what the official MCP system does not:
 *
 * - the multi-scope `mcp.json` files: reading, watching, and writing them, and
 *   turning their effective servers into `ctx.mcpManager.register()` entries;
 * - the Host-only OAuth operations (`startAuthorization`,
 *   `cancelAuthorization`, `signOut`) behind the panel's authenticated RPC;
 * - the per-tool disable policy, applied through a tool guard plus per-agent
 *   restrictions so a disabled tool is neither executed nor listed.
 *
 * Everything else is delegated: live status, restart, and probe come from the
 * official Remote surface in the browser, and the official `mcp-manager`
 * configuration entries are edited through the shared settings form. No second
 * MCP client fleet is mounted here.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ManagerSettings } from '../settings.ts';
import type { RpcResult } from '../types.ts';
export declare class McpManagerController {
    private readonly ctx;
    private readonly config;
    private readonly env;
    private readonly queues;
    private readonly fleet;
    private readonly restrictions;
    private merged;
    private projectPath;
    private disposed;
    private suppressRestrictionEvents;
    private fileWatchDispose;
    private rpcDispose;
    private guardDispose;
    private configPresentationDispose;
    private configWatchDispose;
    /**
     * @param ctx - the Host plugin context carrying `tools`, `settings`, `connection`, and `mcpManager`.
     * @param config - this plugin's own volatile entry config (`disabledTools`).
     * @param env - ambient environment used for `${env:…}` expansion; tests substitute it.
     */
    constructor(ctx: Context, config: ManagerSettings, env?: () => Readonly<Record<string, string | undefined>>);
    /** Start the RPC, the file watch, and the tool policy. */
    start(): Promise<void>;
    /** Dispose RPC, tool policy, file watch, and every registration this plugin owns. */
    dispose(): Promise<void>;
    /** Dispatch one authenticated Connection RPC endpoint. */
    handle(endpoint: string, payload: unknown, signal: AbortSignal): Promise<RpcResult<unknown>>;
    private snapshot;
    private upsert;
    private remove;
    private setEnabled;
    /** Start (or resume) an OAuth attempt for a managed server. */
    private authorize;
    /** Cancel one OAuth attempt by its manager-issued identity. */
    private cancelAuthorization;
    /** Sign out of one managed server, deleting its local grant. */
    private signOut;
    private assertManaged;
    private reload;
    /** Point the file scopes at one project root and re-arm the watcher when it changed. */
    private activateProject;
    private rearmWatch;
    private filesFor;
    private targetFile;
    /** The active profile directory, as the settings provider reports it. */
    private profileDir;
    private resolveProject;
    private winning;
    /** Registered workspaces the panel may root the project scope at. */
    private workspaces;
    private buildSnapshot;
    private readTools;
    private disabledToolNames;
    private settings;
    private agents;
    private installRestriction;
    private removeRestriction;
    private refreshRestrictions;
}
//# sourceMappingURL=controller.d.ts.map