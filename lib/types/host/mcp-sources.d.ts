/**
 * Merge the `mcp.json` sources into one effective server set.
 *
 * Precedence, highest first:
 *
 * | Scope | Path | Notes |
 * |---|---|---|
 * | project | `<project>/.dsh/mcp.json` | selected in the panel, validated against the workspace registry |
 * | project (compat) | `<project>/.mcp.json` | Claude Code's file, read-only |
 * | profile | `~/.dsh/profiles/<profile>/mcp.json` | the default target for a new server |
 * | user | `~/.dsh/mcp.json` | honours `$DSH_HOME` |
 *
 * A server name defined in more than one scope keeps the highest-precedence
 * definition and reports the rest as shadowed, so the panel can show them
 * instead of silently dropping user configuration.
 *
 * This module is pure: it takes filesystem read outcomes and returns the merged
 * model. The official `mcp-manager` configuration entries are a separate
 * source the browser reads through the shared settings form; they never pass
 * through this file.
 */
import type { ReadResult } from './mcp-file.ts';
import type { McpScope, StoredServer } from '../types.ts';
/** One scope row as the panel renders it. */
export interface SourceRow {
    readonly scope: McpScope;
    readonly path: string;
    readonly writable: boolean;
    readonly compat: boolean;
    readonly exists: boolean;
    readonly serverCount: number;
    readonly error?: string;
    /** Per-entry failures inside an otherwise readable file. */
    readonly problems?: readonly {
        readonly id: string;
        readonly error: string;
    }[];
}
/** One effective server plus the scopes that lost to it. */
export interface SourcedServer {
    readonly id: string;
    readonly scope: McpScope;
    readonly path: string;
    /** Whether the winning definition lives in a writable file. */
    readonly writable: boolean;
    /** Whether the winning definition is another client's read-only file. */
    readonly compat: boolean;
    readonly server: StoredServer;
    readonly shadowed: readonly {
        readonly scope: McpScope;
        readonly path: string;
    }[];
}
/** The merged view of every source. */
export interface MergedSources {
    readonly servers: readonly SourcedServer[];
    readonly sources: readonly SourceRow[];
    /** Per-entry failures from every file, including shadowed scopes. */
    readonly problems: readonly {
        readonly scope: McpScope;
        readonly path: string;
        readonly id: string;
        readonly error: string;
    }[];
}
/** Inputs for {@link mergeSources}. */
export interface MergeInput {
    /** Read outcomes in precedence order, as `readScopeFiles` returns them. */
    readonly scopes: readonly ReadResult[];
}
/**
 * Merge every source into the effective server set.
 * @param input - read outcomes.
 * @returns the effective servers and one row per source.
 */
export declare function mergeSources(input: MergeInput): MergedSources;
/** Outcome of projecting one server into an mcp-client-ready definition. */
export interface ExpandedServer {
    readonly server: StoredServer;
    /** Referenced environment variables with no value and no fallback. */
    readonly missing: readonly string[];
}
/**
 * Resolve `${env:…}` templates in every text field a server carries.
 *
 * Expansion happens only here — on the way into
 * `ctx.mcpManager.register()` — so a template never reaches the panel and is
 * never written back expanded. `${credential:…}` tokens are deliberately left
 * untouched: the official MCP client resolves them through the credentials
 * service and redacts the resolved values from diagnostics.
 * @param server - the stored server, templates intact.
 * @param env - ambient environment.
 * @returns the expanded server and the unresolved variable names.
 */
export declare function expandServer(server: StoredServer, env: Readonly<Record<string, string | undefined>>): ExpandedServer;
//# sourceMappingURL=mcp-sources.d.ts.map