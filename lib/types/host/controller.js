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
import { dirname } from 'node:path';
import { applyServerPatch, parseAuthorizeRequest, parseCancelAuthorizationRequest, parseRemoveRequest, parseSetEnabledRequest, parseSignOutRequest, parseSnapshotRequest, parseUpsertRequest, serverFromPatch, toServerView, toWorkspaceViews, } from "../protocol.js";
import { validateDisabledTools } from "../settings.js";
import { normalizeServer, withServer } from "./mcp-json.js";
import { mutateScopeFile, readScopeFiles, resolveScopeFiles, watchScopeFiles } from "./mcp-file.js";
import { mergeSources } from "./mcp-sources.js";
import { RegistrationFleet } from "./registration.js";
import { registerManagerRpcRoute } from "./rpc-channel.js";
import { PerKeyQueue } from "./keyed-queue.js";
/** Serialized endpoint dispatch key. */
const RELOAD_KEY = 'reload';
export class McpManagerController {
    ctx;
    config;
    env;
    queues = new PerKeyQueue();
    fleet;
    restrictions = [];
    merged = { servers: [], sources: [], problems: [] };
    projectPath;
    disposed = false;
    suppressRestrictionEvents = false;
    fileWatchDispose;
    rpcDispose;
    guardDispose;
    configPresentationDispose;
    configWatchDispose;
    /**
     * @param ctx - the Host plugin context carrying `tools`, `settings`, `connection`, and `mcpManager`.
     * @param config - this plugin's own volatile entry config (`disabledTools`).
     * @param env - ambient environment used for `${env:…}` expansion; tests substitute it.
     */
    constructor(ctx, config, env = () => process.env) {
        this.ctx = ctx;
        this.config = config;
        this.env = env;
        this.fleet = new RegistrationFleet(ctx.mcpManager, () => this.env());
    }
    /** Start the RPC, the file watch, and the tool policy. */
    async start() {
        validateDisabledTools(this.config.disabledTools.get() ?? {});
        const settings = this.settings();
        if (typeof settings.configure === 'function') {
            this.configPresentationDispose = settings.configure({ auto: false });
        }
        this.guardDispose = this.ctx.tools.guard(execution => {
            if (!execution.name.startsWith('mcp__'))
                return undefined;
            return this.disabledToolNames().includes(execution.name) ? 'MCP tool is disabled in the MCP manager panel' : undefined;
        });
        this.rpcDispose = registerManagerRpcRoute(this.ctx, (endpoint, payload, signal) => this.handle(endpoint, payload, signal));
        this.configWatchDispose = this.ctx.on('loader/volatile-update', (paths) => {
            if (this.disposed || !paths.some(path => path[0] === 'disabledTools'))
                return;
            this.refreshRestrictions();
        });
        this.ctx.on('tools/change', () => {
            if (this.disposed || this.suppressRestrictionEvents)
                return;
            this.refreshRestrictions();
        });
        this.ctx.on('agent/created', ({ agent }) => {
            this.installRestriction(agent);
            return undefined;
        });
        this.ctx.on('agent/disposed', ({ agent }) => { this.removeRestriction(agent); });
        for (const agent of this.agents())
            this.installRestriction(agent);
        await this.queues.enqueue(RELOAD_KEY, () => this.reload());
        await this.rearmWatch();
    }
    /** Dispose RPC, tool policy, file watch, and every registration this plugin owns. */
    async dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.configWatchDispose?.();
        this.configWatchDispose = undefined;
        this.configPresentationDispose?.();
        this.configPresentationDispose = undefined;
        this.fileWatchDispose?.();
        this.fileWatchDispose = undefined;
        await this.queues.drain();
        for (const restriction of this.restrictions.splice(0))
            restriction.dispose();
        this.guardDispose?.();
        this.guardDispose = undefined;
        this.fleet.dispose();
        if (this.rpcDispose !== undefined)
            await this.rpcDispose();
        this.rpcDispose = undefined;
    }
    /** Dispatch one authenticated Connection RPC endpoint. */
    async handle(endpoint, payload, signal) {
        if (this.disposed)
            return failure('aborted', 'the MCP manager is disposed');
        if (signal.aborted)
            return failure('aborted', 'operation was cancelled');
        try {
            switch (endpoint) {
                case 'snapshot':
                    return success(await this.snapshot(parseSnapshotRequest(payload)));
                case 'upsertServer':
                    return success(await this.upsert(parseUpsertRequest(payload)));
                case 'removeServer': {
                    const request = parseRemoveRequest(payload);
                    return success(await this.remove(request.id, request.projectPath));
                }
                case 'setServerEnabled': {
                    const request = parseSetEnabledRequest(payload);
                    return success(await this.setEnabled(request.id, request.enabled, request.projectPath));
                }
                case 'authorize':
                    return success(await this.authorize(parseAuthorizeRequest(payload).name));
                case 'cancelAuthorization': {
                    const request = parseCancelAuthorizationRequest(payload);
                    return success(await this.cancelAuthorization(request.name, request.id));
                }
                case 'signOut':
                    return success(await this.signOut(parseSignOutRequest(payload).name));
                default:
                    return failure('bad-request', `unknown MCP manager endpoint ${JSON.stringify(endpoint)}`);
            }
        }
        catch (error) {
            return failure(classifyError(error), error instanceof Error ? error.message : String(error));
        }
    }
    // -------------------------------------------------------------- operations
    snapshot(request) {
        return this.queues.enqueue(RELOAD_KEY, async () => {
            const projectPath = this.resolveProject(request.projectPath);
            await this.activateProject(projectPath);
            await this.reload(projectPath);
            return this.buildSnapshot();
        });
    }
    upsert(request) {
        return this.queues.enqueue(RELOAD_KEY, async () => {
            const projectPath = this.resolveProject(request.projectPath);
            await this.activateProject(projectPath);
            await this.reload(projectPath);
            const scope = request.scope ?? this.winning(request.server.id)?.scope ?? 'profile';
            const path = this.targetFile(scope, projectPath);
            const next = serverFromPatch(request.server);
            await mutateScopeFile(path, document => withServer(document, next.id, next));
            await this.reload(projectPath);
            return this.buildSnapshot();
        });
    }
    remove(id, projectPathInput) {
        return this.queues.enqueue(RELOAD_KEY, async () => {
            const projectPath = this.resolveProject(projectPathInput);
            await this.activateProject(projectPath);
            await this.reload(projectPath);
            const winning = this.winning(id);
            if (winning === undefined)
                throw notFound(id);
            if (!winning.writable)
                throw notWritable(id, winning.path);
            await mutateScopeFile(winning.path, document => withServer(document, id, null));
            await this.reload(projectPath);
            return this.buildSnapshot();
        });
    }
    setEnabled(id, enabled, projectPathInput) {
        return this.queues.enqueue(RELOAD_KEY, async () => {
            const projectPath = this.resolveProject(projectPathInput);
            await this.activateProject(projectPath);
            await this.reload(projectPath);
            const winning = this.winning(id);
            if (winning === undefined)
                throw notFound(id);
            if (!winning.writable)
                throw notWritable(id, winning.path);
            await mutateScopeFile(winning.path, (document) => {
                const raw = Object.hasOwn(document.servers, id) ? document.servers[id] : undefined;
                if (raw === undefined)
                    return undefined;
                const normalized = normalizeServer(id, raw);
                if (!normalized.ok)
                    throw new Error(normalized.error);
                return withServer(document, id, applyServerPatch(normalized.server, { id, enabled }));
            });
            await this.reload(projectPath);
            return this.buildSnapshot();
        });
    }
    /** Start (or resume) an OAuth attempt for a managed server. */
    async authorize(name) {
        this.assertManaged(name);
        const view = await this.ctx.mcpManager.startAuthorization(name);
        return authorizationResult(view);
    }
    /** Cancel one OAuth attempt by its manager-issued identity. */
    async cancelAuthorization(name, id) {
        this.assertManaged(name);
        await this.ctx.mcpManager.cancelAuthorization(name, id);
        return null;
    }
    /** Sign out of one managed server, deleting its local grant. */
    async signOut(name) {
        this.assertManaged(name);
        await this.ctx.mcpManager.signOut(name);
        return null;
    }
    assertManaged(name) {
        if (!this.ctx.mcpManager.list().some(view => view.name === name))
            throw notFound(name);
    }
    // ----------------------------------------------------------------- sources
    async reload(projectPath = this.projectPath) {
        const reads = await readScopeFiles(this.filesFor(projectPath));
        const merged = mergeSources({ scopes: reads });
        this.merged = merged;
        this.fleet.reconcile(merged.servers.map(server => server.server));
    }
    /** Point the file scopes at one project root and re-arm the watcher when it changed. */
    async activateProject(projectPath) {
        if (projectPath === this.projectPath)
            return;
        this.projectPath = projectPath;
        await this.rearmWatch();
    }
    async rearmWatch() {
        this.fileWatchDispose?.();
        this.fileWatchDispose = undefined;
        if (this.disposed)
            return;
        this.fileWatchDispose = await watchScopeFiles(this.filesFor(this.projectPath), () => {
            if (this.disposed)
                return;
            void this.queues.enqueue(RELOAD_KEY, async () => {
                await this.reload(this.projectPath);
            }).catch((error) => {
                this.ctx.logger.warn(`dsh-mcp-manager: MCP configuration change reconciliation failed: ${String(error)}`);
            });
        });
    }
    filesFor(projectPath) {
        return resolveScopeFiles({ profileDir: this.profileDir(), projectDir: projectPath });
    }
    targetFile(scope, projectPath) {
        const file = this.filesFor(projectPath).find(entry => entry.scope === scope);
        if (file === undefined) {
            throw Object.assign(new Error(`the ${scope} scope has no writable file in this Host`), { code: 'MCP_SCOPE_UNAVAILABLE' });
        }
        return file.path;
    }
    /** The active profile directory, as the settings provider reports it. */
    profileDir() {
        const path = this.settings().documentPath;
        return typeof path === 'string' && path !== '' ? dirname(path) : undefined;
    }
    resolveProject(projectPath) {
        if (projectPath === undefined)
            return undefined;
        const match = this.workspaces().find(workspace => workspace.path === projectPath);
        if (match === undefined)
            throw Object.assign(new Error(`project path ${JSON.stringify(projectPath)} is not a registered workspace`), { code: 'MCP_PROJECT_NOT_FOUND' });
        return match.path;
    }
    winning(id) {
        return this.merged.servers.find(server => server.id === id);
    }
    /** Registered workspaces the panel may root the project scope at. */
    workspaces() {
        const registry = this.ctx.get('workspaceRegistry');
        if (registry?.list === undefined)
            return [];
        return toWorkspaceViews(registry.list().map(workspace => ({
            id: String(workspace.id),
            path: workspace.path,
            ...workspace.title === undefined ? {} : { title: workspace.title },
        })));
    }
    // ---------------------------------------------------------------- snapshot
    buildSnapshot() {
        const disabled = this.disabledToolNames();
        const managedNames = this.ctx.mcpManager.list().map(view => view.name);
        const snapshot = {
            writable: this.settings().writable ?? true,
            servers: this.merged.servers.map(server => toServerView(server, this.fleet.outcome(server.id))),
            tools: this.readTools(disabled, managedNames),
            sources: this.merged.sources,
            workspaces: this.workspaces(),
            ...this.projectPath === undefined ? {} : { projectPath: this.projectPath },
        };
        return snapshot;
    }
    readTools(disabled, managedNames) {
        const names = [...new Set([...this.merged.servers.map(server => server.id), ...managedNames])]
            .sort((left, right) => right.length - left.length);
        const schemas = this.ctx.tools.schemas();
        return schemas
            .filter(schema => schema.name.startsWith('mcp__'))
            .map(schema => ({
            name: schema.name,
            serverId: names.find(name => schema.name.startsWith(`mcp__${name}__`)) ?? serverIdFromToolName(schema.name),
            description: schema.description ?? '',
            parameters: schema.parameters ?? {},
            enabled: !disabled.includes(schema.name),
        }));
    }
    disabledToolNames() {
        return [...new Set(Object.values(this.config.disabledTools.get() ?? {}).flat())];
    }
    settings() {
        return this.ctx.settings;
    }
    // ------------------------------------------------------------ tool policy
    agents() {
        return this.ctx.get('agents')?.list?.() ?? [];
    }
    installRestriction(agent) {
        if (this.restrictions.some(entry => entry.agent === agent))
            return;
        const tools = agent.ctx.tools;
        if (tools === undefined)
            return;
        const names = this.disabledToolNames().filter(name => this.ctx.tools.get(name, agent) !== undefined);
        if (names.length === 0)
            return;
        const previous = this.suppressRestrictionEvents;
        this.suppressRestrictionEvents = true;
        try {
            const dispose = tools.restrict({ deny: names });
            this.restrictions.push({ agent, dispose });
        }
        catch (error) {
            this.ctx.logger.warn(`dsh-mcp-manager: could not install restrictions for agent ${String(agent.id)}: ${String(error)}`);
        }
        finally {
            this.suppressRestrictionEvents = previous;
        }
    }
    removeRestriction(agent) {
        for (let index = this.restrictions.length - 1; index >= 0; index--) {
            const entry = this.restrictions[index];
            if (entry?.agent !== agent)
                continue;
            const previous = this.suppressRestrictionEvents;
            this.suppressRestrictionEvents = true;
            try {
                entry.dispose();
            }
            finally {
                this.suppressRestrictionEvents = previous;
            }
            this.restrictions.splice(index, 1);
        }
    }
    refreshRestrictions() {
        if (this.disposed || this.suppressRestrictionEvents)
            return;
        const previous = this.suppressRestrictionEvents;
        this.suppressRestrictionEvents = true;
        try {
            const agents = this.agents();
            for (const restriction of this.restrictions.splice(0))
                restriction.dispose();
            for (const agent of agents)
                this.installRestriction(agent);
        }
        finally {
            this.suppressRestrictionEvents = previous;
        }
    }
}
/** `mcp__<server>__<tool>` when the server is not (or no longer) known to the snapshot. */
function serverIdFromToolName(name) {
    const match = /^mcp__(?<server>[^_].*?)__(?<tool>.+)$/u.exec(name);
    return match?.groups?.server ?? '';
}
function authorizationResult(view) {
    return {
        id: view.id,
        phase: view.phase,
        ...view.authorizationUrl === undefined ? {} : { authorizationUrl: view.authorizationUrl },
        ...view.lastError === undefined ? {} : { lastError: view.lastError },
    };
}
function success(value) {
    return { ok: true, value };
}
function failure(code, message) {
    return { ok: false, error: { code, message } };
}
function notFound(id) {
    return Object.assign(new Error(`MCP server ${JSON.stringify(id)} is not defined by any mcp.json file`), { code: 'MCP_NOT_FOUND' });
}
function notWritable(id, path) {
    return Object.assign(new Error(`MCP server ${JSON.stringify(id)} is defined by the read-only file ${path}`), { code: 'MCP_NOT_WRITABLE' });
}
function classifyError(error) {
    const code = error?.code;
    if (code === 'MCP_CONFIG_VALIDATION')
        return 'validation';
    if (code === 'MCP_NOT_FOUND')
        return 'not-found';
    if (code === 'MCP_NOT_WRITABLE')
        return 'not-writable';
    if (code === 'MCP_SCOPE_UNAVAILABLE' || code === 'MCP_PROJECT_NOT_FOUND')
        return 'validation';
    if (error instanceof TypeError)
        return 'bad-request';
    const message = error instanceof Error ? error.message : String(error);
    if (/already configured or registered/u.test(message))
        return 'conflict';
    if (/unknown server|not defined by any/u.test(message))
        return 'not-found';
    if (/read-only/u.test(message))
        return 'not-writable';
    if (/needs a command|needs a URL|invalid URL|must be|must not|contains an|is not a registered workspace|missing environment|unsupported MCP transport|OAuth/u.test(message))
        return 'validation';
    return 'internal';
}
//# sourceMappingURL=controller.js.map