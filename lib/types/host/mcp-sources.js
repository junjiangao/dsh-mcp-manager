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
import { expandMap, expandTemplate } from "./interpolate.js";
import { normalizeServer } from "./mcp-json.js";
/**
 * Merge every source into the effective server set.
 * @param input - read outcomes.
 * @returns the effective servers and one row per source.
 */
export function mergeSources(input) {
    const winners = new Map();
    const order = [];
    const rows = [];
    const problems = [];
    for (const read of input.scopes) {
        const entries = read.document?.servers ?? {};
        const names = Object.keys(entries);
        const rowProblems = [];
        let accepted = 0;
        for (const id of names) {
            const normalized = normalizeServer(id, entries[id]);
            if (!normalized.ok) {
                rowProblems.push({ id, error: normalized.error });
                problems.push({ scope: read.scope, path: read.path, id, error: normalized.error });
                continue;
            }
            accepted += 1;
            const existing = winners.get(id);
            if (existing === undefined) {
                order.push(id);
                winners.set(id, { id, scope: read.scope, path: read.path, writable: read.writable, compat: read.compat, server: normalized.server, shadowed: [] });
            }
            else {
                winners.set(id, { ...existing, shadowed: [...existing.shadowed, { scope: read.scope, path: read.path }] });
            }
        }
        rows.push({
            scope: read.scope,
            path: read.path,
            writable: read.writable,
            compat: read.compat,
            exists: read.exists,
            serverCount: accepted,
            ...read.error === undefined ? {} : { error: read.error },
            ...rowProblems.length === 0 ? {} : { problems: rowProblems },
        });
    }
    return { servers: order.map(id => winners.get(id)), sources: rows, problems };
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
export function expandServer(server, env) {
    const missing = [];
    const record = (names) => {
        for (const name of names)
            if (!missing.includes(name))
                missing.push(name);
    };
    const envMap = expandMap(server.env, env);
    record(envMap.missing);
    const headerMap = expandMap(server.headers, env);
    record(headerMap.missing);
    const command = expandTemplate(server.command, env);
    record(command.missing);
    const cwd = expandTemplate(server.cwd, env);
    record(cwd.missing);
    const url = expandTemplate(server.url, env);
    record(url.missing);
    const args = server.args.map((arg) => {
        const expanded = expandTemplate(arg, env);
        record(expanded.missing);
        return expanded.value;
    });
    return {
        server: {
            ...server,
            command: command.value,
            cwd: cwd.value,
            url: url.value,
            args,
            env: envMap.values,
            headers: headerMap.values,
        },
        missing,
    };
}
//# sourceMappingURL=mcp-sources.js.map