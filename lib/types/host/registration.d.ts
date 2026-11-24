/**
 * Registration reconciliation between the `mcp.json` files and the official
 * `ctx.mcpManager`.
 *
 * Every effective file server becomes one manager registration owned by this
 * plugin: registering contributes the server for this plugin's lifetime, and
 * the returned disposer removes it (the manager then awaits the instance's
 * cleanup and withdraws its tools). A registration must be replaced rather
 * than updated because the manager rejects a duplicate name, so this fleet
 * disposes the previous registration before mounting the next one and skips
 * the churn when the entry is unchanged.
 *
 * The module is Host-only but free of Cordis and filesystem access: it takes
 * the manager face, the ambient environment, and the merged file servers.
 */
import type { McpServerRegistration } from '@deepseek-ai/dsh-mcp-manager';
import type { RegistrationView, StoredServer } from '../types.ts';
/** The manager surface this module needs, structurally typed for tests. */
export interface RegistrationManager {
    list(): readonly {
        readonly name: string;
        readonly configured: boolean;
    }[];
    register(name: string, entry: McpServerRegistration): () => void;
}
/** One reconciled server: what was registered, and why it was not. */
export interface ReconciledServer {
    readonly id: string;
    readonly outcome: RegistrationView;
}
/**
 * Keep the manager's registered set equal to the file servers.
 *
 * `reconcile` is idempotent: unchanged entries keep their live registration,
 * removed entries are disposed, and a failed entry is retried on the next
 * pass (so deleting the colliding configuration entry recovers on refresh).
 */
export declare class RegistrationFleet {
    private readonly manager;
    private readonly env;
    private readonly live;
    private readonly outcomes;
    private disposed;
    /**
     * @param manager - the official MCP manager face.
     * @param env - ambient environment used for `${env:…}` expansion.
     */
    constructor(manager: RegistrationManager, env: () => Readonly<Record<string, string | undefined>>);
    /**
     * Reconcile one full pass over the effective file servers.
     * @param servers - the winning definitions, in panel order.
     * @returns one outcome per server, in the same order.
     */
    reconcile(servers: readonly StoredServer[]): readonly ReconciledServer[];
    /** The outcome of the last reconcile for one server. */
    outcome(id: string): RegistrationView;
    /** Dispose every registration this fleet owns. */
    dispose(): void;
    private apply;
    private credentialConflicts;
    private dropIfLive;
    private drop;
}
//# sourceMappingURL=registration.d.ts.map