import z from "@deepseek-ai/schemastery";
import { basename, dirname, join } from "node:path";
import { watch } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { canonicalizeWatchPath, dshHomePath } from "@deepseek-ai/dsh-home-paths";
import { Config as Config$1 } from "@deepseek-ai/dsh-mcp-client";
//#region lib/types/types.js
/** Shared JSON-safe contracts for the Host RPC and the browser panel. */
/**
* Shared channel carrying the manager's authenticated RPC.
*
* The manager rides the Connection service's own `/api` channel instead of
* claiming a private prefix route:
*
* - The physical `/api` route is mounted by `@deepseek-ai/dsh-client-connection`
*   itself and applies the Host/Origin fence plus browser authentication before
*   anything reaches a handler, so this plugin never repeats that logic.
* - `connection.rpc.handle(channel, …)` cannot be used: its `register()` mounts
*   the physical route through `owner.webServer` where `owner` is the Connection
*   service's own Context, which fails with `cannot get property "webServer"
*   without inject`.
* - `connection.rpc.intercept('/api', …)` cannot be used either: the shared
*   channel accepts exactly one interceptor and `@deepseek-ai/dsh-api-gateway`
*   already owns it.
* - `connection.fetch.register()` is therefore the supported path: one exact
*   Fetch route per endpoint, taking precedence over the interceptor.
*/
const MCP_MANAGER_API_CHANNEL = "/api";
/** Endpoint prefix this plugin owns inside the shared channel. */
const MCP_MANAGER_ENDPOINT_PREFIX = "mcp-manager";
/**
* Every manager endpoint, in registration order.
*
* The `mcp.json` file scopes are written through this private protocol because
* no shared service owns those files. Everything the official MCP manager
* already governs is **not** mirrored here: live status and restart/probe go
* through `ctx.remote.mcpManager`, configuration of the official
* `mcp-manager` entry goes through the shared settings form
* (`ctx.configForms`), and the per-tool policy of this plugin goes through its
* own entry form. The three authorization endpoints exist because the official
* manager exposes `startAuthorization` / `cancelAuthorization` / `signOut` on
* the Host only; they name a server the manager already lists and add no write
* path of their own.
*/
const MCP_MANAGER_ENDPOINTS = [
	"snapshot",
	"upsertServer",
	"removeServer",
	"setServerEnabled",
	"authorize",
	"cancelAuthorization",
	"signOut"
];
/** The Loader entry id this plugin's Host half is mounted under, and its settings namespace. */
const MCP_MANAGER_NAMESPACE = "dsh-mcp-manager";
/**
* The official MCP manager's Loader entry id in the `dsh-web-app` composition.
* It is the settings namespace the panel writes `servers` through.
*/
const MCP_UPSTREAM_NAMESPACE = "mcp-manager";
/**
* Absolute exact Fetch-route path for one endpoint.
*
* The browser client posts to `<channel>/<endpoint>`, its channel grammar
* (`/^\/[A-Za-z0-9._~-]+$/`) admits a single segment only, so the channel is
* `/api` and the endpoint string carries the `mcp-manager/` prefix.
* @param endpoint - one manager endpoint name.
* @returns the path registered through `connection.fetch.register()`.
*/
function mcpManagerRoutePath(endpoint) {
	return `${MCP_MANAGER_API_CHANNEL}/${MCP_MANAGER_ENDPOINT_PREFIX}/${endpoint}`;
}
/** Every `mcp.json` scope this plugin owns, in precedence order. */
const MCP_SCOPES = [
	"project",
	"profile",
	"user"
];
function isRpcResult(value) {
	if (typeof value !== "object" || value === null) return false;
	const record = value;
	if (record.ok === true) return "value" in record;
	if (record.ok !== false || typeof record.error !== "object" || record.error === null) return false;
	const error = record.error;
	return typeof error.code === "string" && typeof error.message === "string";
}
/** 插件的社区注册身份(GitHub owner/repo)。 */
const PLUGIN_IDENTITY = "junjiangao/dsh-mcp-manager";
/** 插件安装后的 npm 包名 / loader 模块名(bundle 层与 patch 条目 name)。 */
const PLUGIN_MODULE_NAME = "@junjiangao/dsh-mcp-manager";
//#endregion
//#region lib/types/server-config.js
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
/**
* Largest delay Node schedules without clamping it to one millisecond.
*
* Same value as `@deepseek-ai/dsh-timeout`'s `MAX_TIMER_DELAY_MS`, inlined so
* this plugin does not carry a peer dependency for one constant.
*/
const MAX_TIMER_DELAY_MS = 2147483647;
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 6e4;
/** The official manager's `startupTimeoutMs` default. */
const DEFAULT_STARTUP_TIMEOUT_MS = 3e4;
/** The official client's `closeTimeoutMs` default. */
const DEFAULT_CLOSE_TIMEOUT_MS = 5e3;
const DEFAULT_OAUTH_REQUEST_TIMEOUT_MS = 1e4;
const DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS = 6e5;
/** `mcp-client` reconnect defaults, kept equal to the official `RECONNECT_DEFAULTS`. */
const DEFAULT_RECONNECT = Object.freeze({
	enabled: true,
	initialDelayMs: 500,
	maxDelayMs: 3e4,
	maxAttempts: 10
});
/** `serverName` grammar in `mcp.json` and in the official manager; also the tool namespace. */
const SERVER_ID_PATTERN = "[-A-Za-z0-9_]{1,32}";
/** The `mcp-client` credential scope the manager requires for OAuth entries. */
const CREDENTIAL_KEY_PATTERN = /^mcp-client\/[^/\s]+$/u;
/** `${env:NAME}` / `${NAME}` / `${NAME:-fallback}`, matching `./host/interpolate.ts`. */
const TEMPLATE_PATTERN = /\$\{(?:env:)?[A-Za-z_][A-Za-z0-9_]*(?::-[^}]*)?\}/u;
/** One `${credential:REF}` token; the whole value must be the token when present. */
const CREDENTIAL_TEMPLATE_PATTERN = /\$\{credential:[^}]+\}/u;
const CREDENTIAL_TEMPLATE_EXACT = /^\$\{credential:[A-Za-z_][A-Za-z0-9_]*\}$/u;
/** Whether a stored value is still an unresolved environment template. */
function isTemplatedValue(value) {
	return TEMPLATE_PATTERN.test(value);
}
/** Whether a stored value references the official credential store. */
function isCredentialTemplate(value) {
	return CREDENTIAL_TEMPLATE_PATTERN.test(value);
}
function defaultServer(id) {
	return {
		id,
		label: "",
		enabled: true,
		transport: "stdio",
		command: "",
		args: [],
		cwd: "",
		url: "",
		env: {},
		headers: {},
		envSensitive: [],
		headerSensitive: [],
		toolCallTimeoutMs: DEFAULT_TOOL_CALL_TIMEOUT_MS,
		startupTimeoutMs: DEFAULT_STARTUP_TIMEOUT_MS,
		closeTimeoutMs: DEFAULT_CLOSE_TIMEOUT_MS,
		reconnect: { ...DEFAULT_RECONNECT },
		toolLoading: "eager"
	};
}
function validateServerId(id) {
	if (!/^[-A-Za-z0-9_]{1,32}$/.test(id)) throw new TypeError("server id must match [-A-Za-z0-9_]{1,32}");
}
function transportOf(value) {
	if (value === "stdio" || value === "streamable-http") return value;
	throw new Error(`unsupported MCP transport ${JSON.stringify(value)}`);
}
/** Validate one complete stored server.
* @param server - the entry to validate.
* @throws TypeError for a malformed shape, Error for a rejected value.
*/
function validateServerConfig(server) {
	validateServerId(server.id);
	if (server.label.length > 120) throw new Error("server label must be at most 120 characters");
	if (server.transport === "stdio") {
		if (server.command.trim() === "") throw new Error(`stdio server ${JSON.stringify(server.id)} needs a command`);
		if (server.url !== "") throw new Error(`stdio server ${JSON.stringify(server.id)} must not set a URL`);
		if (Object.keys(server.headers).length > 0) throw new Error(`stdio server ${JSON.stringify(server.id)} must not set headers`);
	} else {
		if (server.url.trim() === "") throw new Error(`streamable-http server ${JSON.stringify(server.id)} needs a URL`);
		if (server.command !== "") throw new Error(`streamable-http server ${JSON.stringify(server.id)} must not set a command`);
		if (server.args.length > 0) throw new Error(`streamable-http server ${JSON.stringify(server.id)} must not set args`);
		if (Object.keys(server.env).length > 0) throw new Error(`streamable-http server ${JSON.stringify(server.id)} must not set env`);
		if (server.cwd !== "") throw new Error(`streamable-http server ${JSON.stringify(server.id)} must not set cwd`);
		if (!isTemplatedValue(server.url) && !isCredentialTemplate(server.url)) {
			let url;
			try {
				url = new URL(server.url);
			} catch {
				throw new Error(`streamable-http server ${JSON.stringify(server.id)} has an invalid URL`);
			}
			if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`streamable-http server ${JSON.stringify(server.id)} URL must use http or https`);
		}
	}
	validateTimeout(server.toolCallTimeoutMs, "toolCallTimeoutMs", server.id);
	validateTimeout(server.startupTimeoutMs, "startupTimeoutMs", server.id);
	validateTimeout(server.closeTimeoutMs, "closeTimeoutMs", server.id);
	validateReconnect(server.reconnect);
	if (server.toolLoading !== "eager" && server.toolLoading !== "on-demand") throw new Error(`server ${JSON.stringify(server.id)} toolLoading must be "eager" or "on-demand"`);
	for (const [key, value] of Object.entries(server.env)) {
		if (key.trim() === "") throw new Error(`server ${JSON.stringify(server.id)} contains an empty environment key`);
		if (typeof value !== "string") throw new Error(`server ${JSON.stringify(server.id)} environment values must be strings`);
		validateCredentialValue(server.id, `env.${key}`, value);
	}
	for (const [key, value] of Object.entries(server.headers)) {
		if (key.trim() === "") throw new Error(`server ${JSON.stringify(server.id)} contains an empty header key`);
		if (typeof value !== "string") throw new Error(`server ${JSON.stringify(server.id)} header values must be strings`);
		validateCredentialValue(server.id, `headers.${key}`, value);
	}
	validateSensitiveKeys(server.id, "envSensitive", server.envSensitive);
	validateSensitiveKeys(server.id, "headerSensitive", server.headerSensitive);
	if (server.oauth !== void 0) validateOAuthPolicy(server.id, server.transport, server.oauth);
}
/** Validate one OAuth policy for a server.
* @param id - server name, for messages.
* @param transport - the server transport; OAuth requires `streamable-http`.
* @param oauth - the policy to validate.
*/
function validateOAuthPolicy(id, transport, oauth) {
	if (transport !== "streamable-http") throw new Error(`server ${JSON.stringify(id)}: OAuth requires the streamable-http transport`);
	if (!CREDENTIAL_KEY_PATTERN.test(oauth.credentialKey)) throw new Error(`server ${JSON.stringify(id)} oauth.credentialKey must look like "mcp-client/<id>"`);
	if (oauth.clientId !== void 0 && oauth.clientId.trim() === "") throw new Error(`server ${JSON.stringify(id)} oauth.clientId must not be blank`);
	if (oauth.scope !== void 0 && typeof oauth.scope !== "string") throw new Error(`server ${JSON.stringify(id)} oauth.scope must be a string`);
	validateTimeout(oauth.requestTimeoutMs, "oauth.requestTimeoutMs", id);
	validateTimeout(oauth.authorizationTimeoutMs, "oauth.authorizationTimeoutMs", id);
}
function validateReconnect(value) {
	if (!Number.isSafeInteger(value.initialDelayMs) || value.initialDelayMs < 1 || value.initialDelayMs > 2147483647) throw new Error(`reconnect.initialDelayMs must be an integer from 1 to ${String(MAX_TIMER_DELAY_MS)}`);
	if (!Number.isSafeInteger(value.maxDelayMs) || value.maxDelayMs < value.initialDelayMs || value.maxDelayMs > 2147483647) throw new Error(`reconnect.maxDelayMs must be >= initialDelayMs and at most ${String(MAX_TIMER_DELAY_MS)}`);
	if (!Number.isSafeInteger(value.maxAttempts) || value.maxAttempts < 1) throw new Error("reconnect.maxAttempts must be a positive integer");
	if (typeof value.enabled !== "boolean") throw new Error("reconnect.enabled must be a boolean");
}
function isToolLoading(value) {
	return value === "eager" || value === "on-demand";
}
function validateTimeout(value, field, serverId) {
	if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) throw new Error(`server ${JSON.stringify(serverId)} ${field} must be an integer from 1 to ${String(MAX_TIMER_DELAY_MS)}`);
}
function validateCredentialValue(serverId, field, value) {
	if (!CREDENTIAL_TEMPLATE_PATTERN.test(value)) return;
	if (!CREDENTIAL_TEMPLATE_EXACT.test(value)) throw new Error(`server ${JSON.stringify(serverId)} ${field}: a credential reference must be the whole value ("\${credential:REF}")`);
}
function validateSensitiveKeys(serverId, field, keys) {
	const seen = /* @__PURE__ */ new Set();
	for (const key of keys) {
		if (key.trim() === "" || key.length > 256) throw new Error(`server ${JSON.stringify(serverId)} contains an invalid ${field} key`);
		if (seen.has(key)) throw new Error(`server ${JSON.stringify(serverId)} ${field} contains duplicate key ${JSON.stringify(key)}`);
		seen.add(key);
	}
}
//#endregion
//#region lib/types/protocol.js
/** Runtime validation and redacted projections for the manager RPC. */
const MAX_LABEL_LENGTH = 120;
const MAX_ARGUMENTS = 128;
const MAX_TIMEOUT = 2147483647;
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asRecord(value, message) {
	if (!isRecord(value)) throw new TypeError(message);
	return value;
}
function asString(value, field) {
	if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
	return value;
}
function asBoolean(value, field) {
	if (typeof value !== "boolean") throw new TypeError(`${field} must be a boolean`);
	return value;
}
function asNumber(value, field) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${field} must be a number`);
	return value;
}
function parseSnapshotRequest(value) {
	return parseScopeTarget(asRecord(value ?? {}, "snapshot payload must be an object"));
}
/** Read the optional scope/project selection every mutating endpoint accepts. */
function parseScopeTarget(record) {
	const scope = record.scope === void 0 ? void 0 : asScope(record.scope, "scope");
	const projectPath = record.projectPath === void 0 ? void 0 : asString(record.projectPath, "projectPath");
	if (projectPath !== void 0 && !isAbsolutePath(projectPath)) throw new TypeError("projectPath must be an absolute path");
	return {
		...scope === void 0 ? {} : { scope },
		...projectPath === void 0 ? {} : { projectPath }
	};
}
function asScope(value, field) {
	if (typeof value !== "string" || !MCP_SCOPES.includes(value)) throw new TypeError(`${field} must be one of ${MCP_SCOPES.map((scope) => JSON.stringify(scope)).join(", ")}`);
	return value;
}
/** POSIX absolute, Windows drive, or UNC — the spellings a Workspace root uses. */
function isAbsolutePath(path) {
	return path.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(path) || path.startsWith("\\\\");
}
function parseUpsertRequest(value) {
	const record = asRecord(value, "upsertServer payload must be an object");
	return {
		...parseScopeTarget(record),
		server: parseServerPatch(asRecord(record.server, "server must be an object"))
	};
}
function parseRemoveRequest(value) {
	const record = asRecord(value, "removeServer payload must be an object");
	const id = asString(record.id, "id");
	validateServerId(id);
	return {
		id,
		...parseScopeTarget(record)
	};
}
function parseSetEnabledRequest(value) {
	const record = asRecord(value, "setServerEnabled payload must be an object");
	return {
		...parseRemoveRequest(record),
		enabled: asBoolean(record.enabled, "enabled")
	};
}
function parseAuthorizeRequest(value) {
	return { name: parseServerName(asRecord(value, "authorize payload must be an object").name) };
}
function parseCancelAuthorizationRequest(value) {
	const record = asRecord(value, "cancelAuthorization payload must be an object");
	return {
		name: parseServerName(record.name),
		id: requireText(record.id, "id", 256)
	};
}
function parseSignOutRequest(value) {
	return { name: parseServerName(asRecord(value, "signOut payload must be an object").name) };
}
function parseServerName(value) {
	const name = asString(value, "name");
	validateServerId(name);
	return name;
}
function requireText(value, field, max) {
	if (typeof value !== "string" || value.length === 0 || value.length > max) throw new TypeError(`${field} must be a non-empty string of at most ${String(max)} characters`);
	return value;
}
/** Validate one server patch coming from the browser. */
function parseServerPatch(record) {
	const id = requireText(record.id, "server.id", 32);
	validateServerId(id);
	const patch = { id };
	const set = (key, value) => {
		Object.assign(patch, { [key]: value });
	};
	if (record.label !== void 0) {
		const label = asString(record.label, "server.label");
		if (label.length > MAX_LABEL_LENGTH) throw new TypeError(`server.label must be at most ${String(MAX_LABEL_LENGTH)} characters`);
		set("label", label);
	}
	if (record.enabled !== void 0) set("enabled", asBoolean(record.enabled, "server.enabled"));
	if (record.transport !== void 0) set("transport", transportOf(asString(record.transport, "server.transport")));
	if (record.command !== void 0) set("command", asString(record.command, "server.command"));
	if (record.cwd !== void 0) set("cwd", asString(record.cwd, "server.cwd"));
	if (record.url !== void 0) set("url", asString(record.url, "server.url"));
	if (record.args !== void 0) {
		if (!Array.isArray(record.args) || record.args.length > MAX_ARGUMENTS || record.args.some((arg) => typeof arg !== "string")) throw new TypeError(`server.args must be an array of at most ${String(MAX_ARGUMENTS)} strings`);
		set("args", [...record.args]);
	}
	if (record.env !== void 0) set("env", parseSecretMap(record.env, "server.env"));
	if (record.headers !== void 0) set("headers", parseSecretMap(record.headers, "server.headers"));
	if (record.envSensitive !== void 0) set("envSensitive", parseStringList(record.envSensitive, "server.envSensitive"));
	if (record.headerSensitive !== void 0) set("headerSensitive", parseStringList(record.headerSensitive, "server.headerSensitive"));
	if (record.toolCallTimeoutMs !== void 0) set("toolCallTimeoutMs", positiveInteger(record.toolCallTimeoutMs, "server.toolCallTimeoutMs"));
	if (record.startupTimeoutMs !== void 0) set("startupTimeoutMs", positiveInteger(record.startupTimeoutMs, "server.startupTimeoutMs"));
	if (record.closeTimeoutMs !== void 0) set("closeTimeoutMs", positiveInteger(record.closeTimeoutMs, "server.closeTimeoutMs"));
	if (record.reconnect !== void 0) {
		const reconnect = asRecord(record.reconnect, "server.reconnect must be an object");
		const partial = {};
		if (reconnect.enabled !== void 0) partial.enabled = asBoolean(reconnect.enabled, "server.reconnect.enabled");
		if (reconnect.initialDelayMs !== void 0) partial.initialDelayMs = positiveInteger(reconnect.initialDelayMs, "server.reconnect.initialDelayMs");
		if (reconnect.maxDelayMs !== void 0) partial.maxDelayMs = positiveInteger(reconnect.maxDelayMs, "server.reconnect.maxDelayMs");
		if (reconnect.maxAttempts !== void 0) partial.maxAttempts = positiveInteger(reconnect.maxAttempts, "server.reconnect.maxAttempts");
		set("reconnect", partial);
	}
	if (record.toolLoading !== void 0) {
		const value = asString(record.toolLoading, "server.toolLoading");
		if (value !== "eager" && value !== "on-demand") throw new TypeError("server.toolLoading must be \"eager\" or \"on-demand\"");
		set("toolLoading", value);
	}
	if (record.oauth !== void 0) set("oauth", record.oauth === null ? null : parseOAuthPolicy(asRecord(record.oauth, "server.oauth must be an object or null")));
	return patch;
}
function parseSecretMap(value, field) {
	const record = asRecord(value, `${field} must be an object`);
	const map = {};
	for (const [key, entry] of Object.entries(record)) {
		if (key.trim() === "" || key.length > 256) throw new TypeError(`${field} contains an invalid key`);
		if (typeof entry === "string") {
			map[key] = entry;
			continue;
		}
		const patch = asRecord(entry, `${field}.${key} must be a string or a patch object`);
		const secret = {};
		if (patch.value !== void 0) secret.value = asString(patch.value, `${field}.${key}.value`);
		if (patch.clear !== void 0) secret.clear = asBoolean(patch.clear, `${field}.${key}.clear`);
		map[key] = secret.value === void 0 && secret.clear !== true ? {} : secret;
	}
	return map;
}
function parseStringList(value, field) {
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) throw new TypeError(`${field} must be an array of non-empty strings`);
	return [...value];
}
function positiveInteger(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > MAX_TIMEOUT) throw new TypeError(`${field} must be an integer from 1 to ${String(MAX_TIMEOUT)}`);
	return value;
}
function parseOAuthPolicy(record) {
	const policy = {
		credentialKey: requireText(record.credentialKey, "oauth.credentialKey", 256),
		requestTimeoutMs: record.requestTimeoutMs === void 0 ? DEFAULT_OAUTH_REQUEST_TIMEOUT_MS : positiveInteger(record.requestTimeoutMs, "oauth.requestTimeoutMs"),
		authorizationTimeoutMs: record.authorizationTimeoutMs === void 0 ? DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS : positiveInteger(record.authorizationTimeoutMs, "oauth.authorizationTimeoutMs")
	};
	if (record.clientId !== void 0) policy.clientId = asString(record.clientId, "oauth.clientId");
	if (record.scope !== void 0) policy.scope = asString(record.scope, "oauth.scope");
	return policy;
}
/**
* Apply one validated patch to a stored server.
*
* A transport change clears the fields that belong to the other transport, so
* the result always passes {@link validateServerConfig}. `env`/`headers`
* maps are full replacements: a key absent from the patch is removed.
* @param current - the server as stored.
* @param patch - the validated patch.
* @returns a new server; the input is not mutated.
*/
function applyServerPatch(current, patch) {
	const next = {
		...current,
		args: [...current.args],
		env: { ...current.env },
		headers: { ...current.headers },
		envSensitive: [...current.envSensitive],
		headerSensitive: [...current.headerSensitive],
		reconnect: { ...current.reconnect },
		...patch.oauth === void 0 ? {} : patch.oauth === null ? {} : { oauth: { ...patch.oauth } }
	};
	if (patch.oauth === null) Reflect.deleteProperty(next, "oauth");
	if (patch.label !== void 0) next.label = patch.label;
	if (patch.enabled !== void 0) next.enabled = patch.enabled;
	if (patch.command !== void 0) next.command = patch.command;
	if (patch.cwd !== void 0) next.cwd = patch.cwd;
	if (patch.url !== void 0) next.url = patch.url;
	if (patch.args !== void 0) next.args = [...patch.args];
	if (patch.env !== void 0) next.env = resolveSecrets(patch.env, current.env);
	if (patch.headers !== void 0) next.headers = resolveSecrets(patch.headers, current.headers);
	if (patch.envSensitive !== void 0) next.envSensitive = [...patch.envSensitive];
	if (patch.headerSensitive !== void 0) next.headerSensitive = [...patch.headerSensitive];
	if (patch.toolCallTimeoutMs !== void 0) next.toolCallTimeoutMs = patch.toolCallTimeoutMs;
	if (patch.startupTimeoutMs !== void 0) next.startupTimeoutMs = patch.startupTimeoutMs;
	if (patch.closeTimeoutMs !== void 0) next.closeTimeoutMs = patch.closeTimeoutMs;
	if (patch.toolLoading !== void 0) next.toolLoading = patch.toolLoading;
	if (patch.reconnect !== void 0) {
		const merged = { ...current.reconnect };
		if (patch.reconnect.enabled !== void 0) merged.enabled = patch.reconnect.enabled;
		if (patch.reconnect.initialDelayMs !== void 0) merged.initialDelayMs = patch.reconnect.initialDelayMs;
		if (patch.reconnect.maxDelayMs !== void 0) merged.maxDelayMs = patch.reconnect.maxDelayMs;
		if (patch.reconnect.maxAttempts !== void 0) merged.maxAttempts = patch.reconnect.maxAttempts;
		validateReconnect(merged);
		next.reconnect = merged;
	}
	if (patch.transport !== void 0 && patch.transport !== current.transport) {
		next.transport = patch.transport;
		if (patch.transport === "stdio") {
			next.url = "";
			next.headers = {};
			next.headerSensitive = [];
			Reflect.deleteProperty(next, "oauth");
		} else {
			next.command = "";
			next.args = [];
			next.env = {};
			next.cwd = "";
			next.envSensitive = [];
		}
	}
	if (next.oauth !== void 0 && next.transport !== "streamable-http") Reflect.deleteProperty(next, "oauth");
	validateServerConfig(next);
	return next;
}
/** Resolve a full secret map replacement against the current values. */
function resolveSecrets(patch, current) {
	const next = {};
	for (const [key, entry] of Object.entries(patch)) {
		if (typeof entry === "string") {
			next[key] = entry;
			continue;
		}
		if (entry.clear === true) continue;
		if (entry.value !== void 0) next[key] = entry.value;
		else if (current[key] !== void 0) next[key] = current[key];
	}
	return next;
}
/**
* Build one stored server from a fresh patch, applying defaults for absent fields.
* @param patch - the validated patch; its `id` names the server.
* @returns the server to write.
*/
function serverFromPatch(patch) {
	return applyServerPatch({
		...defaultServer(patch.id),
		enabled: true
	}, patch);
}
/** Secret-state projection: existence, masking intent, and template kind only. */
function secretStates(values, sensitive) {
	const masked = new Set(sensitive);
	const result = {};
	for (const [key, value] of Object.entries(values)) result[key] = {
		set: value !== "",
		sensitive: masked.has(key),
		template: isTemplatedValue(value),
		credential: isCredentialTemplate(value)
	};
	return result;
}
/** Names one server keeps as templates, for panel display. */
function templatesOf(server) {
	const env = [];
	const headers = [];
	const credentials = [];
	const scan = (values, target, prefix) => {
		for (const [key, value] of Object.entries(values)) {
			if (isTemplatedValue(value)) target.push(key);
			if (isCredentialTemplate(value)) credentials.push(`${prefix}.${key}`);
		}
	};
	scan(server.env, env, "env");
	scan(server.headers, headers, "headers");
	if (isCredentialTemplate(server.url)) credentials.push("url");
	if (isCredentialTemplate(server.command)) credentials.push("command");
	return {
		env,
		headers,
		credentials
	};
}
/**
* Project one merged file server into the browser view.
* @param sourced - the winning server plus its provenance.
* @param registration - whether the Host registered it with the official manager.
* @returns the redacted view.
*/
function toServerView(sourced, registration) {
	const server = sourced.server;
	return {
		id: sourced.id,
		label: server.label === "" ? sourced.id : server.label,
		enabled: server.enabled,
		transport: server.transport,
		command: server.command,
		args: [...server.args],
		cwd: server.cwd,
		url: server.url,
		env: secretStates(server.env, server.envSensitive),
		headers: secretStates(server.headers, server.headerSensitive),
		toolCallTimeoutMs: server.toolCallTimeoutMs,
		startupTimeoutMs: server.startupTimeoutMs,
		closeTimeoutMs: server.closeTimeoutMs,
		reconnect: { ...server.reconnect },
		toolLoading: server.toolLoading,
		...server.oauth === void 0 ? {} : { oauth: { ...server.oauth } },
		scope: sourced.scope,
		path: sourced.path,
		writable: sourced.writable,
		shadowed: sourced.shadowed.map((entry) => entry.scope),
		templates: templatesOf(server),
		registration
	};
}
/** Redact the workspace registry for the panel. */
function toWorkspaceViews(workspaces) {
	return workspaces.map((workspace) => ({
		id: String(workspace.id),
		path: workspace.path,
		title: workspace.title ?? workspace.path
	}));
}
//#endregion
//#region lib/types/settings.js
/** Host settings schema for this plugin's own Loader entry. */
const MANAGER_NAMESPACE = MCP_MANAGER_NAMESPACE;
/**
* The Loader entry's schema, which is also the form the settings page renders.
*
* The `mcp.json` file scopes and the official `mcp-manager` configuration are
* edited elsewhere; this entry owns one field only: the per-server list of
* public tool names the panel disables. It is `volatile()` so a committed edit
* reaches the running guard without re-registering the plugin.
*/
const Config = z.object({ disabledTools: z.dict(z.array(z.string())).default({}).volatile() });
/** The schema under its historical name; both refer to the same entry config. */
const ManagerSettingsSchema = Config;
/** Validate the entry document before it is used.
* @param value - per-server disabled tool names.
* @throws TypeError for a malformed shape, Error for a rejected name.
*/
function validateDisabledTools(value) {
	for (const [id, tools] of Object.entries(value)) {
		if (!/^[-A-Za-z0-9_]{1,32}$/.test(id)) throw new Error(`disabledTools key ${JSON.stringify(id)} must be a server name`);
		if (!Array.isArray(tools) || tools.some((tool) => typeof tool !== "string" || tool.length === 0 || tool.length > 200)) throw new Error(`disabledTools[${JSON.stringify(id)}] must be a list of tool names`);
	}
}
//#endregion
//#region lib/types/host/mcp-json.js
/**
* `mcp.json` parsing, normalization, and round-trip-preserving writes.
*
* The on-disk shape follows the de-facto ecosystem format (Claude Code, Codex,
* pi, VS Code): a top-level `mcpServers` object keyed by server name. Reads are
* deliberately wider than writes — VS Code's `servers` alias and `http` /
* `streamableHttp` transport spellings are accepted — so a file another client
* wrote can be adopted without rewriting it. Writes are strict and preserve
* every field this plugin does not own, which is what makes sharing one file
* with other tools safe.
*
* This module is pure: no filesystem, no Cordis. `./mcp-file.ts` owns I/O.
*/
/** Primary top-level key holding the server map. */
const MCP_SERVERS_KEY = "mcpServers";
/** VS Code's alias for the same map; read-only. */
const MCP_SERVERS_ALIAS_KEY = "servers";
/** Keys this plugin owns inside one server entry; everything else round-trips. */
const OWNED_SERVER_KEYS = [
	"type",
	"command",
	"args",
	"env",
	"environment",
	"cwd",
	"url",
	"headers",
	"toolCallTimeoutMs",
	"startupTimeoutMs",
	"closeTimeoutMs",
	"reconnect",
	"toolLoading",
	"oauth",
	"enabled",
	"disabled",
	"sensitive",
	"envSensitive",
	"headerSensitive",
	"disabledTools"
];
/**
* Parse one `mcp.json` text.
* @param text - file content.
* @returns the document, or a human-readable failure for the panel.
*/
function parseMcpJson(text) {
	let value;
	try {
		value = JSON.parse(text);
	} catch (error) {
		return {
			ok: false,
			error: `invalid JSON: ${error instanceof Error ? error.message : String(error)}`
		};
	}
	if (!isRecord$1(value)) return {
		ok: false,
		error: "the document root must be a JSON object"
	};
	const warnings = [];
	const hasPrimary = isRecord$1(value[MCP_SERVERS_KEY]);
	const hasAlias = isRecord$1(value[MCP_SERVERS_ALIAS_KEY]);
	if (value["mcpServers"] !== void 0 && !hasPrimary) warnings.push(`"${MCP_SERVERS_KEY}" must be an object`);
	if (value["servers"] !== void 0 && !hasAlias) warnings.push(`"${MCP_SERVERS_ALIAS_KEY}" must be an object`);
	if (hasPrimary && hasAlias) warnings.push(`both "${MCP_SERVERS_KEY}" and "${MCP_SERVERS_ALIAS_KEY}" are present; "${MCP_SERVERS_KEY}" wins`);
	const serversKey = hasPrimary ? MCP_SERVERS_KEY : MCP_SERVERS_ALIAS_KEY;
	const servers = hasPrimary ? value[MCP_SERVERS_KEY] : hasAlias ? value[MCP_SERVERS_ALIAS_KEY] : {};
	return {
		ok: true,
		document: {
			root: value,
			servers,
			serversKey
		},
		warnings
	};
}
/**
* Render a document back to disk text.
*
* The server map is written under the key it was read from, so a file another
* client wrote with VS Code's `servers` alias is not silently restructured. The
* map is written last for a stable field order; two-space indentation and a
* trailing newline match what the other clients in the ecosystem produce.
* @param document - the document to render.
* @returns the exact file text.
*/
function serializeMcpJson(document) {
	const root = { ...document.root };
	Reflect.deleteProperty(root, MCP_SERVERS_KEY);
	Reflect.deleteProperty(root, MCP_SERVERS_ALIAS_KEY);
	return `${JSON.stringify({
		...root,
		[document.serversKey]: document.servers
	}, null, 2)}\n`;
}
/**
* Replace, add, or remove one server in a document.
* @param document - the parsed document.
* @param id - server name.
* @param server - the stored server to write, or `null` to remove it.
* @returns a new document; the input is not mutated.
*/
function withServer(document, id, server) {
	const servers = { ...document.servers };
	if (server === null) Reflect.deleteProperty(servers, id);
	else servers[id] = applyServerToRaw(servers[id], id, server);
	return {
		...document,
		servers
	};
}
/** An empty document, for creating a file that does not exist yet. */
function emptyDocument() {
	return {
		root: {},
		servers: {},
		serversKey: MCP_SERVERS_KEY
	};
}
/** Whether an unknown value is a plain JSON object. */
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Normalize one raw `mcp.json` entry into the manager's stored shape.
*
* Only the fields the panel edits are normalized; the final cross-field check
* is {@link validateServerConfig}, so a file entry and a panel write accept the
* same configurations.
* @param id - the key the entry is stored under; it becomes the server id.
* @param raw - the raw entry value.
* @returns the stored server, or a failure naming the offending field.
*/
function normalizeServer(id, raw) {
	try {
		validateServerId(id);
	} catch {
		return {
			ok: false,
			error: "server name must match [-A-Za-z0-9_]{1,32}"
		};
	}
	if (!isRecord$1(raw)) return {
		ok: false,
		error: "the server entry must be an object"
	};
	const server = defaultServer(id);
	const label = raw.label;
	if (label !== void 0) {
		if (typeof label !== "string") return {
			ok: false,
			error: "\"label\" must be a string"
		};
		server.label = label;
	}
	const disabled = raw.disabled;
	if (raw.enabled !== void 0 && typeof raw.enabled !== "boolean") return {
		ok: false,
		error: "\"enabled\" must be a boolean"
	};
	if (disabled !== void 0 && typeof disabled !== "boolean") return {
		ok: false,
		error: "\"disabled\" must be a boolean"
	};
	server.enabled = typeof raw.enabled === "boolean" ? raw.enabled : disabled === true ? false : true;
	const type = raw.type;
	if (type !== void 0 && typeof type !== "string") return {
		ok: false,
		error: "\"type\" must be a string"
	};
	const transport = transportOfJson(type, raw.url !== void 0);
	if (transport === void 0) return {
		ok: false,
		error: `unsupported transport ${JSON.stringify(type)}: the MCP client supports "stdio" and "streamable-http" only`
	};
	server.transport = transport;
	const env = readStringMap(raw.env ?? raw.environment, "env");
	if (!env.ok) return env;
	const headers = readStringMap(raw.headers, "headers");
	if (!headers.ok) return headers;
	server.env = env.values;
	server.headers = headers.values;
	if (server.transport === "stdio") {
		if (typeof raw.command !== "string" || raw.command.trim() === "") return {
			ok: false,
			error: "a stdio server needs a non-empty \"command\""
		};
		server.command = raw.command;
		const args = raw.args;
		if (args !== void 0 && (!Array.isArray(args) || args.some((entry) => typeof entry !== "string"))) return {
			ok: false,
			error: "\"args\" must be an array of strings"
		};
		server.args = args === void 0 ? [] : [...args];
		if (raw.cwd !== void 0 && typeof raw.cwd !== "string") return {
			ok: false,
			error: "\"cwd\" must be a string"
		};
		server.cwd = typeof raw.cwd === "string" ? raw.cwd : "";
		if (raw.url !== void 0) return {
			ok: false,
			error: "a stdio server must not set \"url\""
		};
		if (Object.keys(server.headers).length > 0) return {
			ok: false,
			error: "a stdio server must not set \"headers\""
		};
	} else {
		if (typeof raw.url !== "string" || raw.url.trim() === "") return {
			ok: false,
			error: "an http server needs a non-empty \"url\""
		};
		server.url = raw.url;
		if (raw.command !== void 0) return {
			ok: false,
			error: "a streamable-http server must not set \"command\""
		};
		if (raw.args !== void 0) return {
			ok: false,
			error: "a streamable-http server must not set \"args\""
		};
		if (raw.cwd !== void 0) return {
			ok: false,
			error: "a streamable-http server must not set \"cwd\""
		};
		if (Object.keys(server.env).length > 0) return {
			ok: false,
			error: "a streamable-http server must not set \"env\""
		};
	}
	const toolCallTimeoutMs = readTimeout(raw.toolCallTimeoutMs, "toolCallTimeoutMs");
	if (toolCallTimeoutMs.error !== void 0) return {
		ok: false,
		error: toolCallTimeoutMs.error
	};
	if (toolCallTimeoutMs.value !== void 0) server.toolCallTimeoutMs = toolCallTimeoutMs.value;
	const startupTimeoutMs = readTimeout(raw.startupTimeoutMs, "startupTimeoutMs");
	if (startupTimeoutMs.error !== void 0) return {
		ok: false,
		error: startupTimeoutMs.error
	};
	if (startupTimeoutMs.value !== void 0) server.startupTimeoutMs = startupTimeoutMs.value;
	const closeTimeoutMs = readTimeout(raw.closeTimeoutMs, "closeTimeoutMs");
	if (closeTimeoutMs.error !== void 0) return {
		ok: false,
		error: closeTimeoutMs.error
	};
	if (closeTimeoutMs.value !== void 0) server.closeTimeoutMs = closeTimeoutMs.value;
	if (raw.reconnect !== void 0) {
		if (!isRecord$1(raw.reconnect)) return {
			ok: false,
			error: "\"reconnect\" must be an object"
		};
		const reconnect = { ...DEFAULT_RECONNECT };
		for (const key of [
			"enabled",
			"initialDelayMs",
			"maxDelayMs",
			"maxAttempts"
		]) {
			const value = raw.reconnect[key];
			if (value === void 0) continue;
			if (key === "enabled") {
				if (typeof value !== "boolean") return {
					ok: false,
					error: "\"reconnect.enabled\" must be a boolean"
				};
				reconnect.enabled = value;
				continue;
			}
			if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return {
				ok: false,
				error: `"reconnect.${key}" must be a positive integer`
			};
			reconnect[key] = value;
		}
		server.reconnect = reconnect;
	}
	if (raw.toolLoading !== void 0) {
		if (!isToolLoading(raw.toolLoading)) return {
			ok: false,
			error: "\"toolLoading\" must be \"eager\" or \"on-demand\""
		};
		server.toolLoading = raw.toolLoading;
	}
	if (raw.oauth !== void 0) {
		if (!isRecord$1(raw.oauth)) return {
			ok: false,
			error: "\"oauth\" must be an object"
		};
		const oauth = normalizeOAuth(raw.oauth);
		if (!oauth.ok) return oauth;
		server.oauth = oauth.oauth;
	}
	const sensitive = readSensitive(raw);
	if (!sensitive.ok) return sensitive;
	server.envSensitive = [...sensitive.env];
	server.headerSensitive = [...sensitive.headers];
	try {
		validateServerConfig(server);
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
	return {
		ok: true,
		server
	};
}
function normalizeOAuth(raw) {
	if (typeof raw.credentialKey !== "string" || raw.credentialKey.trim() === "") return {
		ok: false,
		error: "\"oauth.credentialKey\" must be a non-empty string"
	};
	const oauth = {
		credentialKey: raw.credentialKey,
		requestTimeoutMs: DEFAULT_OAUTH_REQUEST_TIMEOUT_MS,
		authorizationTimeoutMs: DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS
	};
	if (raw.clientId !== void 0) {
		if (typeof raw.clientId !== "string") return {
			ok: false,
			error: "\"oauth.clientId\" must be a string"
		};
		oauth.clientId = raw.clientId;
	}
	if (raw.scope !== void 0) {
		if (typeof raw.scope !== "string") return {
			ok: false,
			error: "\"oauth.scope\" must be a string"
		};
		oauth.scope = raw.scope;
	}
	for (const key of ["requestTimeoutMs", "authorizationTimeoutMs"]) {
		const value = readTimeout(raw[key], `oauth.${key}`);
		if (value.error !== void 0) return {
			ok: false,
			error: value.error
		};
		if (value.value !== void 0) oauth[key] = value.value;
	}
	return {
		ok: true,
		oauth
	};
}
function readTimeout(value, field) {
	if (value === void 0) return {};
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return { error: `"${field}" must be a positive integer` };
	return { value };
}
/**
* Map an `mcp.json` `type` onto a supported transport.
*
* `undefined` infers from the presence of `url`, which is how several clients
* omit `type` for stdio entries.
* @param type - the declared type, when present.
* @param hasUrl - whether the entry carries a `url`.
* @returns the transport, or `undefined` for an unsupported one (`sse`).
*/
function transportOfJson(type, hasUrl) {
	if (type === void 0) return hasUrl ? "streamable-http" : "stdio";
	const normalized = type.trim().toLowerCase().replace(/[_-]/gu, "");
	if (normalized === "stdio") return "stdio";
	if (normalized === "http" || normalized === "streamablehttp" || normalized === "streamable") return "streamable-http";
}
/**
* Project one stored server back into its raw `mcp.json` entry.
*
* Defaults are omitted so a file stays readable and diff-friendly: only
* `type`/`command`/`url` and the fields that differ from the defaults appear.
* @param server - the stored server.
* @returns the raw entry to persist.
*/
function serverToRaw(server) {
	const raw = { type: server.transport === "stdio" ? "stdio" : "http" };
	if (server.label !== "" && server.label !== server.id) raw.label = server.label;
	if (!server.enabled) raw.enabled = false;
	if (server.transport === "stdio") {
		raw.command = server.command;
		raw.args = [...server.args];
		if (server.cwd !== "") raw.cwd = server.cwd;
	} else raw.url = server.url;
	if (Object.keys(server.env).length > 0) raw.env = { ...server.env };
	if (Object.keys(server.headers).length > 0) raw.headers = { ...server.headers };
	if (server.toolCallTimeoutMs !== 6e4) raw.toolCallTimeoutMs = server.toolCallTimeoutMs;
	if (server.startupTimeoutMs !== 3e4) raw.startupTimeoutMs = server.startupTimeoutMs;
	if (server.closeTimeoutMs !== 5e3) raw.closeTimeoutMs = server.closeTimeoutMs;
	if (!sameReconnect(server.reconnect)) raw.reconnect = { ...server.reconnect };
	if (server.toolLoading !== "eager") raw.toolLoading = server.toolLoading;
	if (server.oauth !== void 0) raw.oauth = { ...server.oauth };
	if (server.envSensitive.length > 0 || server.headerSensitive.length > 0) raw.sensitive = {
		...server.envSensitive.length > 0 ? { env: [...server.envSensitive] } : {},
		...server.headerSensitive.length > 0 ? { headers: [...server.headerSensitive] } : {}
	};
	return raw;
}
/**
* Merge a new stored server into an existing raw entry, preserving foreign keys.
* @param existing - the raw entry currently on disk, when present.
* @param id - server name.
* @param next - the stored server to write.
* @returns the raw entry to persist.
*/
function applyServerToRaw(existing, id, next) {
	const merged = isRecord$1(existing) ? { ...existing } : {};
	for (const key of OWNED_SERVER_KEYS) Reflect.deleteProperty(merged, key);
	return {
		...merged,
		...serverToRaw({
			...next,
			id
		})
	};
}
function sameReconnect(server) {
	return server.enabled === DEFAULT_RECONNECT.enabled && server.initialDelayMs === DEFAULT_RECONNECT.initialDelayMs && server.maxDelayMs === DEFAULT_RECONNECT.maxDelayMs && server.maxAttempts === DEFAULT_RECONNECT.maxAttempts;
}
function readStringMap(value, field) {
	if (value === void 0) return {
		ok: true,
		values: {}
	};
	if (!isRecord$1(value)) return {
		ok: false,
		error: `"${field}" must be an object of strings`
	};
	const values = {};
	for (const [key, entry] of Object.entries(value)) {
		if (typeof entry !== "string") return {
			ok: false,
			error: `"${field}.${key}" must be a string`
		};
		values[key] = entry;
	}
	return {
		ok: true,
		values
	};
}
function readSensitive(raw) {
	const nested = isRecord$1(raw.sensitive) ? raw.sensitive : {};
	const env = raw.envSensitive ?? nested.env;
	const headers = raw.headerSensitive ?? nested.headers;
	const read = (value, field) => {
		if (value === void 0) return [];
		if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) return `"${field}" must be an array of strings`;
		return [...value];
	};
	const envValue = read(env, "sensitive.env");
	if (typeof envValue === "string") return {
		ok: false,
		error: envValue
	};
	const headerValue = read(headers, "sensitive.headers");
	if (typeof headerValue === "string") return {
		ok: false,
		error: headerValue
	};
	return {
		ok: true,
		env: envValue,
		headers: headerValue
	};
}
//#endregion
//#region lib/types/host/mcp-file.js
/**
* Filesystem access for the `mcp.json` sources.
*
* Paths come from the official helpers (`dshHomePath` honours `$DSH_HOME`), and
* every write goes through the official atomic-write primitives: a
* `withFileLock` read-modify-write cycle committing through `writeFileAtomic`.
* Readers stay lock-free because the rename is atomic, and two writers can never
* resurrect a state the other just replaced. Files are created `0600` because a
* `mcp.json` may legitimately hold a literal secret.
*/
/** File name every scope uses. */
const MCP_FILE_NAME = "mcp.json";
/** Project-local directory that owns the project scope. */
const MCP_PROJECT_DIR = ".dsh";
/** Claude Code's project file name; read-only compatibility input. */
const MCP_COMPAT_FILE_NAME = ".mcp.json";
/** Owner-only permissions: a `mcp.json` may hold a literal secret. */
const FILE_MODE = 384;
/** Owner-only directory mode for the `.dsh` folder this plugin creates. */
const DIR_MODE = 448;
/** Coalescing window for filesystem events, in milliseconds. */
const WATCH_DEBOUNCE_MS = 250;
/**
* Resolve the scope files for this Host instance.
*
* Scope order is precedence order, highest first: project, profile, user. A
* scope whose root cannot be resolved is omitted rather than guessed.
* @param roots - resolved roots from the Host.
* @returns the scope files in precedence order.
*/
function resolveScopeFiles(roots) {
	const files = [];
	if (roots.projectDir !== void 0) files.push({
		scope: "project",
		path: join(roots.projectDir, MCP_PROJECT_DIR, MCP_FILE_NAME),
		compatPath: join(roots.projectDir, MCP_COMPAT_FILE_NAME)
	});
	if (roots.profileDir !== void 0) files.push({
		scope: "profile",
		path: join(roots.profileDir, MCP_FILE_NAME)
	});
	files.push({
		scope: "user",
		path: roots.home === void 0 ? dshHomePath(MCP_FILE_NAME) : join(roots.home, MCP_FILE_NAME)
	});
	return files;
}
/**
* Read one file without creating or locking it.
* @param scope - the scope the file belongs to.
* @param path - absolute file path.
* @param writable - whether the panel may write this file.
* @param compat - whether this is the read-only compatibility input of `scope`.
* @returns the read outcome; a missing file is an empty, successful read.
*/
async function readScopePath(scope, path, writable, compat = false) {
	const outcome = await readDocument(path);
	return {
		scope,
		path,
		writable,
		compat,
		exists: outcome.exists,
		...outcome.document === void 0 ? {} : { document: outcome.document },
		...outcome.error === void 0 ? {} : { error: outcome.error }
	};
}
/**
* Read every scope file plus each project's compatibility file.
*
* Every entry resolves independently, so one unreadable or malformed file
* leaves the others usable — a broken `mcp.json` must never take the panel down.
* @param files - scope files in precedence order.
* @returns each row's read outcome; a project's `.mcp.json` follows its own file.
*/
async function readScopeFiles(files) {
	const results = [];
	for (const file of files) {
		results.push(await readScopePath(file.scope, file.path, true));
		if (file.compatPath !== void 0) {
			const compat = await readScopePath(file.scope, file.compatPath, false, true);
			if (compat.exists || compat.error !== void 0) results.push(compat);
		}
	}
	return results;
}
/**
* Apply one mutation to a scope file under the official cross-process lock.
*
* The current text is re-read inside the lock, so a concurrent editor's write is
* never silently reverted. An unparsable file refuses the write instead of being
* overwritten: the user must repair it.
* @param path - absolute file path.
* @param mutate - derives the next document from the current one; `undefined` cancels the write.
* @returns the written text, or `undefined` when the mutation cancelled.
* @throws when the existing file is unreadable as JSON, or the write fails.
*/
async function mutateScopeFile(path, mutate) {
	await mkdir(dirname(path), {
		recursive: true,
		mode: DIR_MODE
	});
	return withFileLock(path, async () => {
		const current = await readDocument(path);
		if (current.error !== void 0) throw new Error(current.error);
		const next = mutate(current.document ?? emptyDocument());
		if (next === void 0) return void 0;
		const text = serializeMcpJson(next);
		await writeFileAtomic(path, text, {
			mode: FILE_MODE,
			dirMode: DIR_MODE
		});
		return text;
	});
}
/**
* Watch every scope file's directory and coalesce events into one callback.
*
* The directory — not the file — is watched, so create, replace, and delete all
* arrive, and a file that does not exist yet is picked up when it appears.
* `canonicalizeWatchPath` gives the native watcher one canonical spelling even
* while the final components are still missing.
* @param files - scope files to watch.
* @param onChange - invoked after the debounce window when any watched name changes.
* @returns a disposer closing every watcher.
*/
async function watchScopeFiles(files, onChange) {
	const watched = /* @__PURE__ */ new Map();
	for (const file of files) {
		const paths = [file.path, ...file.compatPath === void 0 ? [] : [file.compatPath]];
		for (const path of paths) {
			const directory = await nearestExistingDirectory(dirname(path));
			if (directory === void 0) continue;
			const directoryPath = await canonicalizeWatchPath(directory);
			const names = watched.get(directoryPath) ?? /* @__PURE__ */ new Set();
			names.add(basename(path));
			watched.set(directoryPath, names);
		}
	}
	const watchers = [];
	let timer;
	let disposed = false;
	const fire = () => {
		if (disposed) return;
		if (timer !== void 0) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = void 0;
			if (!disposed) onChange();
		}, WATCH_DEBOUNCE_MS);
		timer.unref();
	};
	for (const [directory, names] of watched) try {
		const watcher = watch(directory, { persistent: false }, (_event, filename) => {
			if (filename === null || names.has(filename.toString())) fire();
		});
		watcher.on("error", () => {});
		watchers.push(watcher);
	} catch {}
	return () => {
		disposed = true;
		if (timer !== void 0) clearTimeout(timer);
		for (const watcher of watchers) watcher.close();
	};
}
/** Read and parse one file; absence is a successful empty result. */
async function readDocument(path) {
	let text;
	try {
		text = await readFile(path, "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return { exists: false };
		return {
			exists: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
	const parsed = parseMcpJson(text);
	if (!parsed.ok) return {
		exists: true,
		error: parsed.error
	};
	return {
		exists: true,
		document: parsed.document
	};
}
/** Walk up until an existing directory is found, without creating anything. */
async function nearestExistingDirectory(path) {
	let current = path;
	for (;;) {
		try {
			if ((await stat(current)).isDirectory()) return current;
		} catch {}
		const parent = dirname(current);
		if (parent === current) return void 0;
		current = parent;
	}
}
//#endregion
//#region lib/types/host/interpolate.js
/**
* `${env:NAME}` template expansion for `mcp.json` values.
*
* `mcp.json` files are shared with other MCP clients (Claude Code, Codex, pi,
* VS Code), so a secret must be able to stay a template in the file and never
* reach the panel. Expansion happens exactly once, on the Host, at the moment
* a server is projected into `@deepseek-ai/dsh-mcp-client`'s Config.
*
* Accepted spellings, matching the surrounding ecosystem:
*
* | Form | Meaning |
* |---|---|
* | `${env:NAME}` | ambient environment |
* | `${NAME}` | ambient environment (shorthand) |
* | `${NAME:-fallback}` | fallback when unset or empty |
* | `$${NAME}` | a literal `${NAME}` |
*
* An unresolved reference without a fallback is reported, never silently
* substituted: the server is surfaced with a failure that names the variable.
*/
/** One `${…}` reference, with or without the `env:` prefix and a `:-` fallback. */
const REFERENCE = /\$\{(?:env:)?([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/gu;
/** An escaped `$${…}`, kept literal and never reported as a reference. */
const ESCAPED = /\$\$\{/gu;
/** Sentinel standing in for an escaped `$${` while references are matched. */
const ESCAPE_SENTINEL = "\0";
/**
* Expand every environment reference in one value.
* @param text - the raw value as stored in `mcp.json`.
* @param env - environment mapping; `undefined` and `''` both count as unset.
* @returns the expanded text and the unresolved names.
*/
function expandTemplate(text, env) {
	const missing = [];
	return {
		value: text.replace(ESCAPED, ESCAPE_SENTINEL).replace(REFERENCE, (match, name, fallback) => {
			const resolved = env[name];
			if (resolved !== void 0 && resolved !== "") return resolved;
			if (fallback !== void 0) return fallback;
			if (!missing.includes(name)) missing.push(name);
			return match;
		}).split(ESCAPE_SENTINEL).join("${"),
		missing
	};
}
/**
* Expand every value of one map, collecting unresolved names across the map.
* @param values - raw key/value pairs.
* @param env - environment mapping.
* @returns expanded pairs (insertion order preserved) and the unresolved names.
*/
function expandMap(values, env) {
	const expanded = {};
	const missing = [];
	for (const [key, value] of Object.entries(values)) {
		const result = expandTemplate(value, env);
		expanded[key] = result.value;
		for (const name of result.missing) if (!missing.includes(name)) missing.push(name);
	}
	return {
		values: expanded,
		missing
	};
}
//#endregion
//#region lib/types/host/mcp-sources.js
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
/**
* Merge every source into the effective server set.
* @param input - read outcomes.
* @returns the effective servers and one row per source.
*/
function mergeSources(input) {
	const winners = /* @__PURE__ */ new Map();
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
				rowProblems.push({
					id,
					error: normalized.error
				});
				problems.push({
					scope: read.scope,
					path: read.path,
					id,
					error: normalized.error
				});
				continue;
			}
			accepted += 1;
			const existing = winners.get(id);
			if (existing === void 0) {
				order.push(id);
				winners.set(id, {
					id,
					scope: read.scope,
					path: read.path,
					writable: read.writable,
					compat: read.compat,
					server: normalized.server,
					shadowed: []
				});
			} else winners.set(id, {
				...existing,
				shadowed: [...existing.shadowed, {
					scope: read.scope,
					path: read.path
				}]
			});
		}
		rows.push({
			scope: read.scope,
			path: read.path,
			writable: read.writable,
			compat: read.compat,
			exists: read.exists,
			serverCount: accepted,
			...read.error === void 0 ? {} : { error: read.error },
			...rowProblems.length === 0 ? {} : { problems: rowProblems }
		});
	}
	return {
		servers: order.map((id) => winners.get(id)),
		sources: rows,
		problems
	};
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
function expandServer(server, env) {
	const missing = [];
	const record = (names) => {
		for (const name of names) if (!missing.includes(name)) missing.push(name);
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
			headers: headerMap.values
		},
		missing
	};
}
//#endregion
//#region lib/types/host/mcp-config.js
/**
* Adapter between this plugin's stored server shape and the official MCP
* manager's registration entry, plus the schema-backed validation that keeps a
* bad file entry from reaching `ctx.mcpManager.register()`.
*/
/** Defaults the official manager applies to an entry it receives. */
const REGISTRATION_DEFAULTS = {
	failOnStartupError: false,
	expandTemplates: true
};
/**
* Project one stored server into the manager's registration entry.
*
* The manager forces `expandTemplates: true` and `failOnStartupError: false`
* itself; repeating them here keeps the entry self-describing and makes the
* validation candidate identical to what the manager builds.
* @param server - the stored server, environment templates already expanded.
* @returns the registration entry; `enabled` is deliberately absent.
*/
function toRegistration(server) {
	const shared = {
		transport: server.transport,
		startupTimeoutMs: server.startupTimeoutMs,
		closeTimeoutMs: server.closeTimeoutMs,
		toolCallTimeoutMs: server.toolCallTimeoutMs,
		reconnect: { ...server.reconnect },
		toolLoading: server.toolLoading,
		...server.oauth === void 0 ? {} : { oauth: { ...server.oauth } }
	};
	if (server.transport === "stdio") return {
		...shared,
		command: server.command,
		args: [...server.args],
		cwd: server.cwd,
		env: { ...server.env }
	};
	return {
		...shared,
		url: server.url,
		headers: { ...server.headers }
	};
}
/**
* Validate one server with the official client's own schema.
*
* This is the same schema the manager runs when the entry is registered, so a
* mismatch surfaces in the panel before the file is written (or at least
* before the server silently fails to load).
* @param server - the stored server.
* @throws Error carrying `code: 'MCP_CONFIG_VALIDATION'`.
*/
function validateMcpConfig(server) {
	const candidate = {
		...REGISTRATION_DEFAULTS,
		serverName: server.id,
		...toRegistration(server)
	};
	try {
		Config$1(candidate);
	} catch (error) {
		const message = `MCP configuration is invalid: ${error instanceof Error ? error.message : String(error)}`;
		throw Object.assign(new Error(message), { code: "MCP_CONFIG_VALIDATION" });
	}
}
//#endregion
//#region lib/types/host/registration.js
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
/**
* Keep the manager's registered set equal to the file servers.
*
* `reconcile` is idempotent: unchanged entries keep their live registration,
* removed entries are disposed, and a failed entry is retried on the next
* pass (so deleting the colliding configuration entry recovers on refresh).
*/
var RegistrationFleet = class {
	manager;
	env;
	live = /* @__PURE__ */ new Map();
	outcomes = /* @__PURE__ */ new Map();
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
		if (this.disposed) return servers.map((server) => ({
			id: server.id,
			outcome: {
				state: "error",
				error: "the plugin is disposed"
			}
		}));
		const wanted = new Set(servers.map((server) => server.id));
		for (const [name, entry] of [...this.live]) {
			if (wanted.has(name)) continue;
			this.drop(name, entry);
		}
		const conflicts = this.credentialConflicts(servers);
		const results = [];
		for (const server of servers) {
			const outcome = this.apply(server, conflicts);
			this.outcomes.set(server.id, outcome);
			results.push({
				id: server.id,
				outcome
			});
		}
		for (const name of [...this.outcomes.keys()]) if (!wanted.has(name)) this.outcomes.delete(name);
		return results;
	}
	/** The outcome of the last reconcile for one server. */
	outcome(id) {
		return this.outcomes.get(id) ?? {
			state: "error",
			error: "server has not been reconciled yet"
		};
	}
	/** Dispose every registration this fleet owns. */
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		for (const [name, entry] of [...this.live]) this.drop(name, entry);
		this.outcomes.clear();
	}
	apply(server, conflicts) {
		if (!server.enabled) {
			this.dropIfLive(server.id);
			return { state: "disabled" };
		}
		const expanded = expandServer(server, this.env());
		if (expanded.missing.length > 0) {
			this.dropIfLive(server.id);
			return {
				state: "missing-env",
				missing: [...expanded.missing]
			};
		}
		const conflict = conflicts.get(server.id);
		if (conflict !== void 0) {
			this.dropIfLive(server.id);
			return {
				state: "invalid",
				error: conflict
			};
		}
		try {
			validateServerConfig(expanded.server);
			validateMcpConfig(expanded.server);
		} catch (error) {
			this.dropIfLive(server.id);
			return {
				state: "invalid",
				error: messageOf(error)
			};
		}
		const entry = toRegistration(expanded.server);
		const fingerprint = stableStringify(entry);
		const existing = this.live.get(server.id);
		if (existing !== void 0 && existing.fingerprint === fingerprint) return { state: "registered" };
		this.dropIfLive(server.id);
		try {
			const dispose = this.manager.register(server.id, entry);
			this.live.set(server.id, {
				dispose,
				fingerprint
			});
			return { state: "registered" };
		} catch (error) {
			const message = messageOf(error);
			return {
				state: classify(message),
				error: message
			};
		}
	}
	credentialConflicts(servers) {
		const byKey = /* @__PURE__ */ new Map();
		for (const server of servers) {
			if (server.oauth === void 0) continue;
			const owners = byKey.get(server.oauth.credentialKey) ?? [];
			owners.push(server.id);
			byKey.set(server.oauth.credentialKey, owners);
		}
		const conflicts = /* @__PURE__ */ new Map();
		for (const [key, owners] of byKey) {
			if (owners.length < 2) continue;
			for (const owner of owners) {
				const others = owners.filter((name) => name !== owner).map((name) => JSON.stringify(name)).join(", ");
				conflicts.set(owner, `OAuth credential ${JSON.stringify(key)} is already used by ${others}`);
			}
		}
		return conflicts;
	}
	dropIfLive(id) {
		const entry = this.live.get(id);
		if (entry !== void 0) this.drop(id, entry);
	}
	drop(id, entry) {
		this.live.delete(id);
		try {
			entry.dispose();
		} catch {}
	}
};
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
function classify(message) {
	if (/already configured or registered/u.test(message)) return "conflict";
	if (/manager is disposed|not (?:active|loaded)|disposed/u.test(message)) return "error";
	return "invalid";
}
/** JSON with sorted object keys, so an unchanged entry keeps its registration. */
function stableStringify(value) {
	return JSON.stringify(sortValue(value));
}
function sortValue(value) {
	if (Array.isArray(value)) return value.map(sortValue);
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}
/**
* Register every manager endpoint as an exact Fetch route.
* @param ctx - Host plugin Context carrying `connection`.
* @param dispatch - decoded-endpoint handler.
* @returns disposer removing all routes.
*/
function registerManagerRpcRoute(ctx, dispatch) {
	const disposers = MCP_MANAGER_ENDPOINTS.map((endpoint) => ctx.effect(() => ctx.connection.fetch.register(managerRoute(endpoint, dispatch)), `dsh-mcp-manager: ${mcpManagerRoutePath(endpoint)} route`));
	return async () => {
		await Promise.all(disposers.map((dispose) => Promise.resolve(dispose())));
	};
}
function managerRoute(endpoint, dispatch) {
	return {
		path: mcpManagerRoutePath(endpoint),
		methods: ["POST"],
		requestBody: "buffered",
		fetch: (request) => handleRequest(endpoint, dispatch, request)
	};
}
/**
* Validate one browser envelope, dispatch it, and frame the answer.
*
* The Connection bridge caps a buffered body at the carrier's configured
* `maxRequestBodyBytes` (300 MiB by default), far above any settings payload,
* so the manager enforces its own 2 MiB ceiling here — declared length first,
* then the decoded body.
*/
async function handleRequest(endpoint, dispatch, request) {
	if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return plain(415);
	const declaredLength = request.headers.get("content-length");
	if (declaredLength !== null && Number(declaredLength) > 2097152) return plain(413);
	let text;
	try {
		text = await request.text();
	} catch {
		return plain(400);
	}
	if (Buffer.byteLength(text, "utf8") > 2097152) return plain(413);
	let envelope;
	try {
		envelope = JSON.parse(text);
	} catch {
		return plain(400);
	}
	const parsed = parseClientRequest(envelope);
	if (parsed === void 0) return plain(400);
	let result;
	try {
		result = await dispatch(endpoint, parsed.payload, request.signal);
	} catch (error) {
		result = {
			ok: false,
			error: {
				code: "internal",
				message: error instanceof Error ? error.message : String(error),
				details: {}
			}
		};
	}
	const response = {
		type: "server-response",
		rpcId: parsed.rpcId,
		result: result.ok ? result : {
			ok: false,
			error: {
				...result.error,
				details: result.error.details ?? {}
			}
		}
	};
	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { "content-type": "application/json" }
	});
}
/** Validate the browser envelope `{ type, rpcId, method, payload }` before dispatch. */
function parseClientRequest(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const record = value;
	if (record.type !== "client-request" || typeof record.rpcId !== "string" || record.rpcId.length === 0) return void 0;
	if (record.rpcId.length > 256) return void 0;
	return {
		rpcId: record.rpcId,
		payload: record.payload
	};
}
function plain(status) {
	return new Response(null, { status });
}
//#endregion
//#region lib/types/host/keyed-queue.js
/**
* Serialize async tasks per string key. Tasks with the same key run strictly
* one after another, tasks with different keys run concurrently, and each
* task's rejection is isolated: it never blocks later tasks with the same key.
*/
var PerKeyQueue = class {
	tails = /* @__PURE__ */ new Map();
	/** Run `task` after any previously queued task with the same key settles. */
	enqueue(key, task) {
		const run = (this.tails.get(key) ?? Promise.resolve()).then(task);
		this.tails.set(key, run.then(() => void 0, () => void 0));
		return run;
	}
	/** Wait for all queued tasks to settle; the queue remains usable afterwards. */
	async drain() {
		const tails = [...this.tails.values()];
		this.tails.clear();
		await Promise.allSettled(tails);
	}
};
//#endregion
//#region lib/types/host/controller.js
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
/** Serialized endpoint dispatch key. */
const RELOAD_KEY = "reload";
var McpManagerController = class {
	ctx;
	config;
	env;
	queues = new PerKeyQueue();
	fleet;
	restrictions = [];
	merged = {
		servers: [],
		sources: [],
		problems: []
	};
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
		if (typeof settings.configure === "function") this.configPresentationDispose = settings.configure({ auto: false });
		this.guardDispose = this.ctx.tools.guard((execution) => {
			if (!execution.name.startsWith("mcp__")) return void 0;
			return this.disabledToolNames().includes(execution.name) ? "MCP tool is disabled in the MCP manager panel" : void 0;
		});
		this.rpcDispose = registerManagerRpcRoute(this.ctx, (endpoint, payload, signal) => this.handle(endpoint, payload, signal));
		this.configWatchDispose = this.ctx.on("loader/volatile-update", (paths) => {
			if (this.disposed || !paths.some((path) => path[0] === "disabledTools")) return;
			this.refreshRestrictions();
		});
		this.ctx.on("tools/change", () => {
			if (this.disposed || this.suppressRestrictionEvents) return;
			this.refreshRestrictions();
		});
		this.ctx.on("agent/created", ({ agent }) => {
			this.installRestriction(agent);
		});
		this.ctx.on("agent/disposed", ({ agent }) => {
			this.removeRestriction(agent);
		});
		for (const agent of this.agents()) this.installRestriction(agent);
		await this.queues.enqueue(RELOAD_KEY, () => this.reload());
		await this.rearmWatch();
	}
	/** Dispose RPC, tool policy, file watch, and every registration this plugin owns. */
	async dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.configWatchDispose?.();
		this.configWatchDispose = void 0;
		this.configPresentationDispose?.();
		this.configPresentationDispose = void 0;
		this.fileWatchDispose?.();
		this.fileWatchDispose = void 0;
		await this.queues.drain();
		for (const restriction of this.restrictions.splice(0)) restriction.dispose();
		this.guardDispose?.();
		this.guardDispose = void 0;
		this.fleet.dispose();
		if (this.rpcDispose !== void 0) await this.rpcDispose();
		this.rpcDispose = void 0;
	}
	/** Dispatch one authenticated Connection RPC endpoint. */
	async handle(endpoint, payload, signal) {
		if (this.disposed) return failure("aborted", "the MCP manager is disposed");
		if (signal.aborted) return failure("aborted", "operation was cancelled");
		try {
			switch (endpoint) {
				case "snapshot": return success(await this.snapshot(parseSnapshotRequest(payload)));
				case "upsertServer": return success(await this.upsert(parseUpsertRequest(payload)));
				case "removeServer": {
					const request = parseRemoveRequest(payload);
					return success(await this.remove(request.id, request.projectPath));
				}
				case "setServerEnabled": {
					const request = parseSetEnabledRequest(payload);
					return success(await this.setEnabled(request.id, request.enabled, request.projectPath));
				}
				case "authorize": return success(await this.authorize(parseAuthorizeRequest(payload).name));
				case "cancelAuthorization": {
					const request = parseCancelAuthorizationRequest(payload);
					return success(await this.cancelAuthorization(request.name, request.id));
				}
				case "signOut": return success(await this.signOut(parseSignOutRequest(payload).name));
				default: return failure("bad-request", `unknown MCP manager endpoint ${JSON.stringify(endpoint)}`);
			}
		} catch (error) {
			return failure(classifyError(error), error instanceof Error ? error.message : String(error));
		}
	}
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
			const scope = request.scope ?? this.winning(request.server.id)?.scope ?? "profile";
			const path = this.targetFile(scope, projectPath);
			const next = serverFromPatch(request.server);
			await mutateScopeFile(path, (document) => withServer(document, next.id, next));
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
			if (winning === void 0) throw notFound(id);
			if (!winning.writable) throw notWritable(id, winning.path);
			await mutateScopeFile(winning.path, (document) => withServer(document, id, null));
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
			if (winning === void 0) throw notFound(id);
			if (!winning.writable) throw notWritable(id, winning.path);
			await mutateScopeFile(winning.path, (document) => {
				const raw = Object.hasOwn(document.servers, id) ? document.servers[id] : void 0;
				if (raw === void 0) return void 0;
				const normalized = normalizeServer(id, raw);
				if (!normalized.ok) throw new Error(normalized.error);
				return withServer(document, id, applyServerPatch(normalized.server, {
					id,
					enabled
				}));
			});
			await this.reload(projectPath);
			return this.buildSnapshot();
		});
	}
	/** Start (or resume) an OAuth attempt for a managed server. */
	async authorize(name) {
		this.assertManaged(name);
		return authorizationResult(await this.ctx.mcpManager.startAuthorization(name));
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
		if (!this.ctx.mcpManager.list().some((view) => view.name === name)) throw notFound(name);
	}
	async reload(projectPath = this.projectPath) {
		const merged = mergeSources({ scopes: await readScopeFiles(this.filesFor(projectPath)) });
		this.merged = merged;
		this.fleet.reconcile(merged.servers.map((server) => server.server));
	}
	/** Point the file scopes at one project root and re-arm the watcher when it changed. */
	async activateProject(projectPath) {
		if (projectPath === this.projectPath) return;
		this.projectPath = projectPath;
		await this.rearmWatch();
	}
	async rearmWatch() {
		this.fileWatchDispose?.();
		this.fileWatchDispose = void 0;
		if (this.disposed) return;
		this.fileWatchDispose = await watchScopeFiles(this.filesFor(this.projectPath), () => {
			if (this.disposed) return;
			this.queues.enqueue(RELOAD_KEY, async () => {
				await this.reload(this.projectPath);
			}).catch((error) => {
				this.ctx.logger.warn(`dsh-mcp-manager: MCP configuration change reconciliation failed: ${String(error)}`);
			});
		});
	}
	filesFor(projectPath) {
		return resolveScopeFiles({
			profileDir: this.profileDir(),
			projectDir: projectPath
		});
	}
	targetFile(scope, projectPath) {
		const file = this.filesFor(projectPath).find((entry) => entry.scope === scope);
		if (file === void 0) throw Object.assign(/* @__PURE__ */ new Error(`the ${scope} scope has no writable file in this Host`), { code: "MCP_SCOPE_UNAVAILABLE" });
		return file.path;
	}
	/** The active profile directory, as the settings provider reports it. */
	profileDir() {
		const path = this.settings().documentPath;
		return typeof path === "string" && path !== "" ? dirname(path) : void 0;
	}
	resolveProject(projectPath) {
		if (projectPath === void 0) return void 0;
		const match = this.workspaces().find((workspace) => workspace.path === projectPath);
		if (match === void 0) throw Object.assign(/* @__PURE__ */ new Error(`project path ${JSON.stringify(projectPath)} is not a registered workspace`), { code: "MCP_PROJECT_NOT_FOUND" });
		return match.path;
	}
	winning(id) {
		return this.merged.servers.find((server) => server.id === id);
	}
	/** Registered workspaces the panel may root the project scope at. */
	workspaces() {
		const registry = this.ctx.get("workspaceRegistry");
		if (registry?.list === void 0) return [];
		return toWorkspaceViews(registry.list().map((workspace) => ({
			id: String(workspace.id),
			path: workspace.path,
			...workspace.title === void 0 ? {} : { title: workspace.title }
		})));
	}
	buildSnapshot() {
		const disabled = this.disabledToolNames();
		const managedNames = this.ctx.mcpManager.list().map((view) => view.name);
		return {
			writable: this.settings().writable ?? true,
			servers: this.merged.servers.map((server) => toServerView(server, this.fleet.outcome(server.id))),
			tools: this.readTools(disabled, managedNames),
			sources: this.merged.sources,
			workspaces: this.workspaces(),
			...this.projectPath === void 0 ? {} : { projectPath: this.projectPath }
		};
	}
	readTools(disabled, managedNames) {
		const names = [.../* @__PURE__ */ new Set([...this.merged.servers.map((server) => server.id), ...managedNames])].sort((left, right) => right.length - left.length);
		return this.ctx.tools.schemas().filter((schema) => schema.name.startsWith("mcp__")).map((schema) => ({
			name: schema.name,
			serverId: names.find((name) => schema.name.startsWith(`mcp__${name}__`)) ?? serverIdFromToolName(schema.name),
			description: schema.description ?? "",
			parameters: schema.parameters ?? {},
			enabled: !disabled.includes(schema.name)
		}));
	}
	disabledToolNames() {
		return [...new Set(Object.values(this.config.disabledTools.get() ?? {}).flat())];
	}
	settings() {
		return this.ctx.settings;
	}
	agents() {
		return this.ctx.get("agents")?.list?.() ?? [];
	}
	installRestriction(agent) {
		if (this.restrictions.some((entry) => entry.agent === agent)) return;
		const tools = agent.ctx.tools;
		if (tools === void 0) return;
		const names = this.disabledToolNames().filter((name) => this.ctx.tools.get(name, agent) !== void 0);
		if (names.length === 0) return;
		const previous = this.suppressRestrictionEvents;
		this.suppressRestrictionEvents = true;
		try {
			const dispose = tools.restrict({ deny: names });
			this.restrictions.push({
				agent,
				dispose
			});
		} catch (error) {
			this.ctx.logger.warn(`dsh-mcp-manager: could not install restrictions for agent ${String(agent.id)}: ${String(error)}`);
		} finally {
			this.suppressRestrictionEvents = previous;
		}
	}
	removeRestriction(agent) {
		for (let index = this.restrictions.length - 1; index >= 0; index--) {
			const entry = this.restrictions[index];
			if (entry?.agent !== agent) continue;
			const previous = this.suppressRestrictionEvents;
			this.suppressRestrictionEvents = true;
			try {
				entry.dispose();
			} finally {
				this.suppressRestrictionEvents = previous;
			}
			this.restrictions.splice(index, 1);
		}
	}
	refreshRestrictions() {
		if (this.disposed || this.suppressRestrictionEvents) return;
		const previous = this.suppressRestrictionEvents;
		this.suppressRestrictionEvents = true;
		try {
			const agents = this.agents();
			for (const restriction of this.restrictions.splice(0)) restriction.dispose();
			for (const agent of agents) this.installRestriction(agent);
		} finally {
			this.suppressRestrictionEvents = previous;
		}
	}
};
/** `mcp__<server>__<tool>` when the server is not (or no longer) known to the snapshot. */
function serverIdFromToolName(name) {
	return /^mcp__(?<server>[^_].*?)__(?<tool>.+)$/u.exec(name)?.groups?.server ?? "";
}
function authorizationResult(view) {
	return {
		id: view.id,
		phase: view.phase,
		...view.authorizationUrl === void 0 ? {} : { authorizationUrl: view.authorizationUrl },
		...view.lastError === void 0 ? {} : { lastError: view.lastError }
	};
}
function success(value) {
	return {
		ok: true,
		value
	};
}
function failure(code, message) {
	return {
		ok: false,
		error: {
			code,
			message
		}
	};
}
function notFound(id) {
	return Object.assign(/* @__PURE__ */ new Error(`MCP server ${JSON.stringify(id)} is not defined by any mcp.json file`), { code: "MCP_NOT_FOUND" });
}
function notWritable(id, path) {
	return Object.assign(/* @__PURE__ */ new Error(`MCP server ${JSON.stringify(id)} is defined by the read-only file ${path}`), { code: "MCP_NOT_WRITABLE" });
}
function classifyError(error) {
	const code = error?.code;
	if (code === "MCP_CONFIG_VALIDATION") return "validation";
	if (code === "MCP_NOT_FOUND") return "not-found";
	if (code === "MCP_NOT_WRITABLE") return "not-writable";
	if (code === "MCP_SCOPE_UNAVAILABLE" || code === "MCP_PROJECT_NOT_FOUND") return "validation";
	if (error instanceof TypeError) return "bad-request";
	const message = error instanceof Error ? error.message : String(error);
	if (/already configured or registered/u.test(message)) return "conflict";
	if (/unknown server|not defined by any/u.test(message)) return "not-found";
	if (/read-only/u.test(message)) return "not-writable";
	if (/needs a command|needs a URL|invalid URL|must be|must not|contains an|is not a registered workspace|missing environment|unsupported MCP transport|OAuth/u.test(message)) return "validation";
	return "internal";
}
//#endregion
//#region lib/types/host/index.js
/** Host entry for the MCP manager plugin. */
const name = "@junjiangao/dsh-mcp-manager";
/**
* `mcpManager` is a hard dependency: without the official manager there is no
* fleet to manage, so the plugin must not load (README documents the
* `dsh-web-app` composition requirement). `connection` is the authenticated
* carrier for the file-scope RPC and the Host-only OAuth operations.
*/
const inject = [
	"settings",
	"connection",
	"tools",
	"mcpManager"
];
/**
* Start the controller on the Host Cordis fiber.
* @param ctx - the Host plugin context.
* @param config - the entry's resolved volatile refs.
*/
async function apply(ctx, config) {
	const controller = new McpManagerController(ctx, config);
	try {
		await controller.start();
	} catch (error) {
		await controller.dispose();
		throw error;
	}
	ctx.effect(() => async () => {
		await controller.dispose();
	}, "dsh-mcp-manager: dispose");
}
//#endregion
export { CREDENTIAL_KEY_PATTERN, Config, DEFAULT_CLOSE_TIMEOUT_MS, DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS, DEFAULT_OAUTH_REQUEST_TIMEOUT_MS, DEFAULT_RECONNECT, DEFAULT_STARTUP_TIMEOUT_MS, DEFAULT_TOOL_CALL_TIMEOUT_MS, MANAGER_NAMESPACE, MAX_TIMER_DELAY_MS, MCP_MANAGER_API_CHANNEL, MCP_MANAGER_ENDPOINTS, MCP_MANAGER_ENDPOINT_PREFIX, MCP_MANAGER_NAMESPACE, MCP_SCOPES, MCP_UPSTREAM_NAMESPACE, ManagerSettingsSchema, McpManagerController, PLUGIN_IDENTITY, PLUGIN_MODULE_NAME, SERVER_ID_PATTERN, apply, applyServerPatch, asBoolean, asNumber, asRecord, asString, defaultServer, inject, isCredentialTemplate, isRecord, isRpcResult, isTemplatedValue, isToolLoading, mcpManagerRoutePath, name, parseAuthorizeRequest, parseCancelAuthorizationRequest, parseRemoveRequest, parseServerPatch, parseSetEnabledRequest, parseSignOutRequest, parseSnapshotRequest, parseUpsertRequest, secretStates, serverFromPatch, templatesOf, toServerView, toWorkspaceViews, transportOf, validateDisabledTools, validateOAuthPolicy, validateReconnect, validateServerConfig, validateServerId };

//# sourceMappingURL=index.js.map