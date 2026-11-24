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
import { validateMcpConfig, toRegistration } from "./mcp-config.js";
import { expandServer } from "./mcp-sources.js";
import { validateServerConfig } from "../server-config.js";
/**
 * Keep the manager's registered set equal to the file servers.
 *
 * `reconcile` is idempotent: unchanged entries keep their live registration,
 * removed entries are disposed, and a failed entry is retried on the next
 * pass (so deleting the colliding configuration entry recovers on refresh).
 */
export class RegistrationFleet {
    manager;
    env;
    live = new Map();
    outcomes = new Map();
    disposed = false;
    /**
     * @param manager - the official MCP manager face.
     * @param env - ambient environment used for `${env:…}` expansion.
     */
    constructor(manager, env) {
        this.manager = manager;
        this.env = env;
    }
    /**
     * Reconcile one full pass over the effective file servers.
     * @param servers - the winning definitions, in panel order.
     * @returns one outcome per server, in the same order.
     */
    reconcile(servers) {
        if (this.disposed)
            return servers.map(server => ({ id: server.id, outcome: { state: 'error', error: 'the plugin is disposed' } }));
        const wanted = new Set(servers.map(server => server.id));
        for (const [name, entry] of [...this.live]) {
            if (wanted.has(name))
                continue;
            this.drop(name, entry);
        }
        const conflicts = this.credentialConflicts(servers);
        const results = [];
        for (const server of servers) {
            const outcome = this.apply(server, conflicts);
            this.outcomes.set(server.id, outcome);
            results.push({ id: server.id, outcome });
        }
        for (const name of [...this.outcomes.keys()])
            if (!wanted.has(name))
                this.outcomes.delete(name);
        return results;
    }
    /** The outcome of the last reconcile for one server. */
    outcome(id) {
        return this.outcomes.get(id) ?? { state: 'error', error: 'server has not been reconciled yet' };
    }
    /** Dispose every registration this fleet owns. */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const [name, entry] of [...this.live])
            this.drop(name, entry);
        this.outcomes.clear();
    }
    apply(server, conflicts) {
        if (!server.enabled) {
            this.dropIfLive(server.id);
            return { state: 'disabled' };
        }
        const expanded = expandServer(server, this.env());
        if (expanded.missing.length > 0) {
            this.dropIfLive(server.id);
            return { state: 'missing-env', missing: [...expanded.missing] };
        }
        const conflict = conflicts.get(server.id);
        if (conflict !== undefined) {
            this.dropIfLive(server.id);
            return { state: 'invalid', error: conflict };
        }
        try {
            validateServerConfig(expanded.server);
            validateMcpConfig(expanded.server);
        }
        catch (error) {
            this.dropIfLive(server.id);
            return { state: 'invalid', error: messageOf(error) };
        }
        const entry = toRegistration(expanded.server);
        const fingerprint = stableStringify(entry);
        const existing = this.live.get(server.id);
        if (existing !== undefined && existing.fingerprint === fingerprint)
            return { state: 'registered' };
        this.dropIfLive(server.id);
        try {
            const dispose = this.manager.register(server.id, entry);
            this.live.set(server.id, { dispose, fingerprint });
            return { state: 'registered' };
        }
        catch (error) {
            const message = messageOf(error);
            return { state: classify(message), error: message };
        }
    }
    credentialConflicts(servers) {
        const byKey = new Map();
        for (const server of servers) {
            if (server.oauth === undefined)
                continue;
            const owners = byKey.get(server.oauth.credentialKey) ?? [];
            owners.push(server.id);
            byKey.set(server.oauth.credentialKey, owners);
        }
        const conflicts = new Map();
        for (const [key, owners] of byKey) {
            if (owners.length < 2)
                continue;
            for (const owner of owners) {
                const others = owners.filter(name => name !== owner).map(name => JSON.stringify(name)).join(', ');
                conflicts.set(owner, `OAuth credential ${JSON.stringify(key)} is already used by ${others}`);
            }
        }
        return conflicts;
    }
    dropIfLive(id) {
        const entry = this.live.get(id);
        if (entry !== undefined)
            this.drop(id, entry);
    }
    drop(id, entry) {
        this.live.delete(id);
        try {
            entry.dispose();
        }
        catch {
            // The manager already unloaded the instance; a throwing disposer must
            // not stop the rest of the reconcile.
        }
    }
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
function classify(message) {
    if (/already configured or registered/u.test(message))
        return 'conflict';
    if (/manager is disposed|not (?:active|loaded)|disposed/u.test(message))
        return 'error';
    return 'invalid';
}
/** JSON with sorted object keys, so an unchanged entry keeps its registration. */
function stableStringify(value) {
    return JSON.stringify(sortValue(value));
}
function sortValue(value) {
    if (Array.isArray(value))
        return value.map(sortValue);
    if (typeof value !== 'object' || value === null)
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
}
//# sourceMappingURL=registration.js.map