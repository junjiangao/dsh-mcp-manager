window.__ModuleLoader__.load({
	id: "@junjiangao/dsh-mcp-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/locales.js
		/** Settings → MCP dictionary. The Host sends only keys; every string lives here. */
		const zh = {
			title: "MCP 服务",
			subtitle: "统一管理官方 mcp-manager 配置条目与各作用域的 mcp.json。",
			count: "{count} 个服务",
			add: "新增服务",
			refresh: "刷新",
			refreshing: "刷新中…",
			close: "关闭",
			cancel: "取消",
			save: "保存",
			saving: "保存中…",
			delete: "删除",
			edit: "编辑",
			more: "更多操作",
			back: "返回",
			none: "无",
			unknown: "未知",
			retry: "重试",
			loading: "加载中…",
			copied: "已复制",
			copyJson: "复制 JSON",
			"summary.connected": "{count} 已连接",
			"summary.busy": "{count} 连接中",
			"summary.attention": "{count} 需处理",
			"summary.disabled": "{count} 已停用",
			"filter.search": "搜索服务",
			"filter.searchPlaceholder": "名称、命令、URL 或工具",
			"filter.source": "来源",
			"filter.status": "状态",
			"filter.all": "全部",
			"filter.attention": "需处理",
			"source.entry": "配置条目",
			"source.file": "mcp.json",
			"status.connected": "已连接",
			"status.connecting": "连接中",
			"status.reconnecting": "重连中",
			"status.waitingCredentials": "缺少凭据",
			"status.waitingAuthorization": "等待授权",
			"status.failed": "连接失败",
			"status.disabled": "已停用",
			"status.closed": "已关闭",
			"status.unknown": "等待状态",
			"status.cleanup": "清理未完成",
			"detail.connected": "{count} 个工具 · 最近连接于 {time}",
			"detail.connecting": "第 {attempt} 次尝试",
			"detail.reconnecting": "第 {attempt}/{max} 次 · {time} 后重试",
			"detail.waitingCredentials": "{error}",
			"detail.waitingAuthorization": "需要 OAuth 授权：{reason}",
			"detail.failed": "{reason}",
			"detail.cleanup": "实例未能确认关闭，重启 DSH 可重新接管。",
			"reason.gaveUp": "重连次数已达上限",
			"reason.reconnectDisabled": "已关闭自动重连",
			"reason.unclosed": "上一代实例未能确认关闭",
			"reason.load": "插件加载失败：{error}",
			"authReason.missing": "尚未授权",
			"authReason.expired": "授权已过期",
			"authReason.binding": "授权与当前配置不匹配",
			"authReason.rejected": "服务器拒绝了授权",
			"authReason.scope": "授权范围不足",
			"registration.registered": "已注册",
			"registration.disabled": "已停用（不注册）",
			"registration.missingEnv": "缺少环境变量：{names}",
			"registration.invalid": "配置无效：{error}",
			"registration.conflict": "名称已被配置条目占用",
			"registration.error": "注册失败：{error}",
			"scope.project": "项目",
			"scope.profile": "配置级",
			"scope.user": "用户级",
			"scope.entry": "配置条目",
			"scope.compat": "兼容文件",
			"action.restart": "重启",
			"action.probe": "探测",
			"action.authorize": "授权",
			"action.signOut": "退出登录",
			"action.cancelAuthorization": "取消授权",
			"action.viewTools": "查看工具",
			"action.copyJson": "复制 JSON",
			"action.enable": "启用",
			"action.disable": "停用",
			"notice.restarted": "已请求重启 {name}",
			"notice.saved": "已保存 {name}",
			"notice.deleted": "已删除 {name}",
			"notice.enabled": "已启用 {name}",
			"notice.disabled": "已停用 {name}",
			"notice.authorized": "授权已完成",
			"notice.signedOut": "已退出 {name} 的授权",
			"notice.probeOk": "{name} 探测成功",
			"notice.probeFailed": "{name} 探测失败",
			"notice.copied": "已复制到剪贴板",
			"notice.copyFailed": "复制失败，请手动选择文本",
			"notice.failed": "操作失败：{message}",
			"confirm.deleteTitle": "删除 MCP 服务",
			"confirm.deleteDescription": "将从其所在的 mcp.json 中删除「{name}」，并立刻撤销注册与其工具。此操作不可撤销。",
			"confirm.acknowledge": "我已了解影响",
			"confirm.cancel": "取消",
			"confirm.delete": "删除服务",
			"card.stdio": "stdio",
			"card.http": "streamable-http",
			"card.command": "命令",
			"card.url": "URL",
			"card.args": "参数",
			"card.cwd": "工作目录",
			"card.env": "环境变量",
			"card.headers": "请求头",
			"card.tools": "工具",
			"card.toolCount": "{count} 个工具",
			"card.noTools": "当前没有已注册的工具",
			"card.onDemand": "按需加载：工具进入上下文前不会出现在列表里，可在探测中查看服务器声明。",
			"card.timeouts": "启动 {startup} ms · 关闭 {close} ms · 调用 {call} ms",
			"card.reconnect": "重连：{initial}→{max} ms，最多 {attempts} 次",
			"card.reconnectOff": "重连：关闭",
			"card.oauth": "OAuth",
			"card.readonly": "只读文件",
			"card.shadowed": "被 {scopes} 中的同名定义覆盖",
			"card.path": "来源文件",
			"card.disabledTools": "{count} 个工具已禁用",
			"card.entryHint": "官方配置条目，保存后由 mcp-manager 重建实例。",
			"card.toolPolicy": "工具策略",
			"tool.search": "搜索工具",
			"tool.parameters": "参数 schema",
			"tool.enable": "启用工具",
			"tool.disable": "禁用工具",
			"editor.new": "新增 MCP 服务",
			"editor.edit": "编辑 {name}",
			"editor.target": "写入位置",
			"editor.targetEntry": "官方配置条目（推荐）",
			"editor.targetProject": "项目级 .dsh/mcp.json",
			"editor.targetProfile": "配置级 mcp.json",
			"editor.targetUser": "用户级 mcp.json",
			"editor.targetHintEntry": "写入 mcp-manager 的 servers，由官方管理器直接治理；可在任意环境复用。",
			"editor.targetHintFile": "写入文件，与其它 MCP 客户端共享；注册由本插件负责。",
			"editor.name": "名称",
			"editor.nameHint": "字母、数字、下划线和减号，最多 32 个字符；也是工具命名空间。",
			"editor.transport": "传输方式",
			"editor.command": "命令",
			"editor.args": "参数",
			"editor.addArg": "添加参数",
			"editor.removeArg": "删除参数",
			"editor.cwd": "工作目录",
			"editor.url": "URL",
			"editor.env": "环境变量",
			"editor.headers": "请求头",
			"editor.addRow": "添加一行",
			"editor.removeRow": "删除这一行",
			"editor.keyPlaceholder": "名称",
			"editor.valuePlaceholder": "值或 ${env:NAME}",
			"editor.secret": "敏感值",
			"editor.secretKept": "已保存，留空表示不修改",
			"editor.secretHint": "已保存的敏感值不会回显；留空保存时保持原值。",
			"editor.templated": "环境模板",
			"editor.credentialTemplate": "凭据模板，由 dsh 解析",
			"editor.advanced": "高级选项",
			"editor.startupTimeout": "启动超时（毫秒）",
			"editor.closeTimeout": "关闭超时（毫秒）",
			"editor.toolCallTimeout": "工具调用超时（毫秒）",
			"editor.reconnect": "自动重连",
			"editor.reconnectEnabled": "启用自动重连",
			"editor.initialDelay": "首次延迟（毫秒）",
			"editor.maxDelay": "最大延迟（毫秒）",
			"editor.maxAttempts": "最大次数",
			"editor.toolLoading": "工具加载",
			"editor.eager": "全部加载",
			"editor.onDemand": "按需加载",
			"editor.onDemandHint": "按需加载只注册一个加载器，模型需要时再取工具目录。",
			"editor.oauth": "OAuth 授权",
			"editor.oauthAdd": "配置 OAuth",
			"editor.oauthRemove": "移除 OAuth",
			"editor.credentialKey": "凭据键",
			"editor.clientId": "客户端 ID（可选）",
			"editor.scope": "授权范围（可选）",
			"editor.requestTimeout": "请求超时（毫秒）",
			"editor.authorizationTimeout": "授权超时（毫秒）",
			"editor.oauthHint": "凭据值由 dsh 的凭据存储保存；此处只保留引用。",
			"editor.invalid.required": "必填",
			"editor.invalid.name": "名称必须匹配 [-A-Za-z0-9_]{1,32}",
			"editor.invalid.command": "stdio 服务必须填写命令",
			"editor.invalid.url": "请输入 http(s) URL",
			"editor.invalid.timeout": "请输入 1 到 2147483647 之间的整数",
			"editor.invalid.envKey": "环境变量/请求头名称不能为空",
			"editor.invalid.credential": "凭据模板必须独占整个值",
			"editor.conflict": "保存被拒绝：配置已在别处修改",
			"editor.conflictHint": "面板已重新读取最新配置，请核对后再次保存。",
			"editor.noWorkspace": "还没有可用的项目工作区",
			"editor.noProject": "先选择项目，才能写入项目级 mcp.json。",
			"editor.noEntryWrite": "官方 mcp-manager 不可用：无法写入配置条目，请改用 mcp.json。",
			"probe.title": "探测 {name}",
			"probe.running": "正在连接并读取工具目录…",
			"probe.success": "探测成功",
			"probe.failure": "探测失败",
			"probe.stage": "阶段",
			"probe.duration": "耗时",
			"probe.server": "服务器",
			"probe.tools": "声明的工具",
			"probe.truncated": "工具列表已截断",
			"probe.closeConfirmed": "连接已确认关闭",
			"probe.cleanupError": "清理异常：{error}",
			"probe.again": "再次探测",
			"probe.done": "完成",
			"probe.stageConnect": "连接",
			"probe.stageList": "列举工具",
			"probe.empty": "服务器没有声明任何工具",
			"oauth.title": "{name} 的授权",
			"oauth.starting": "正在启动授权…",
			"oauth.waitingBrowser": "等待在浏览器中完成授权",
			"oauth.exchanging": "正在交换令牌…",
			"oauth.committing": "正在保存授权…",
			"oauth.authorized": "授权成功",
			"oauth.cancelled": "授权已取消",
			"oauth.failed": "授权失败：{error}",
			"oauth.open": "打开授权页面",
			"oauth.cancel": "取消授权",
			"oauth.done": "完成",
			"oauth.signOut": "退出登录",
			"oauth.hint": "授权在运行 DSH 的电脑上的浏览器完成。完成后服务器会自动重连。",
			"oauth.startFailed": "无法启动授权：{message}",
			"sources.title": "文件来源",
			"sources.hint": "同名服务按项目 → 配置级 → 用户级顺序生效；上层定义会覆盖下层。",
			"sources.writable": "可写",
			"sources.readonly": "只读",
			"sources.missing": "文件尚未创建",
			"sources.count": "{count} 个服务",
			"sources.problems": "{count} 个条目无效",
			"sources.compat": "兼容文件",
			"sources.error": "读取失败：{error}",
			"sources.open": "查看",
			"empty.title": "还没有 MCP 服务",
			"empty.description": "新增一个服务，或把现有 MCP 客户端的 mcpServers 配置放进 ~/.dsh/mcp.json。",
			"empty.action": "新增第一个服务",
			"error.snapshot": "读取 MCP 配置失败：{message}",
			"error.stream": "服务状态流已断开，正在等待重连…",
			"error.upstream": "官方 mcp-manager 表单不可用，配置条目暂不可编辑。",
			"error.write": "保存失败：{message}",
			"loading.servers": "正在读取 MCP 配置…",
			"loading.tools": "正在读取工具…",
			"panel.toolsNote": "工具开关仅影响本插件对模型的暴露；服务器仍会保持连接。",
			"panel.entryUnavailable": "未检测到官方 mcp-manager 配置，配置条目只读。",
			"panel.scopeNote": "项目级服务只在该工作区生效。"
		};
		const en = {
			title: "MCP servers",
			subtitle: "One place for the official mcp-manager entries and every mcp.json scope.",
			count: "{count} servers",
			add: "Add server",
			refresh: "Refresh",
			refreshing: "Refreshing…",
			close: "Close",
			cancel: "Cancel",
			save: "Save",
			saving: "Saving…",
			delete: "Delete",
			edit: "Edit",
			more: "More actions",
			back: "Back",
			none: "None",
			unknown: "Unknown",
			retry: "Retry",
			loading: "Loading…",
			copied: "Copied",
			copyJson: "Copy JSON",
			"summary.connected": "{count} connected",
			"summary.busy": "{count} connecting",
			"summary.attention": "{count} need attention",
			"summary.disabled": "{count} disabled",
			"filter.search": "Search servers",
			"filter.searchPlaceholder": "Name, command, URL, or tool",
			"filter.source": "Source",
			"filter.status": "Status",
			"filter.all": "All",
			"filter.attention": "Needs attention",
			"source.entry": "Config entry",
			"source.file": "mcp.json",
			"status.connected": "Connected",
			"status.connecting": "Connecting",
			"status.reconnecting": "Reconnecting",
			"status.waitingCredentials": "Missing credentials",
			"status.waitingAuthorization": "Waiting for authorization",
			"status.failed": "Failed",
			"status.disabled": "Disabled",
			"status.closed": "Closed",
			"status.unknown": "Waiting for status",
			"status.cleanup": "Cleanup incomplete",
			"detail.connected": "{count} tools · connected {time}",
			"detail.connecting": "Attempt {attempt}",
			"detail.reconnecting": "Attempt {attempt}/{max} · retrying in {time}",
			"detail.waitingCredentials": "{error}",
			"detail.waitingAuthorization": "OAuth required: {reason}",
			"detail.failed": "{reason}",
			"detail.cleanup": "The previous instance did not confirm closure; restart DSH to take it over again.",
			"reason.gaveUp": "Reconnect attempts exhausted",
			"reason.reconnectDisabled": "Automatic reconnect is off",
			"reason.unclosed": "The previous generation did not confirm closure",
			"reason.load": "Plugin activation failed: {error}",
			"authReason.missing": "not authorized yet",
			"authReason.expired": "authorization expired",
			"authReason.binding": "authorization no longer matches the configuration",
			"authReason.rejected": "the server rejected the authorization",
			"authReason.scope": "insufficient scope",
			"registration.registered": "Registered",
			"registration.disabled": "Disabled (not registered)",
			"registration.missingEnv": "Missing environment: {names}",
			"registration.invalid": "Invalid configuration: {error}",
			"registration.conflict": "The name is already taken by a config entry",
			"registration.error": "Registration failed: {error}",
			"scope.project": "Project",
			"scope.profile": "Profile",
			"scope.user": "User",
			"scope.entry": "Config entry",
			"scope.compat": "Compat file",
			"action.restart": "Restart",
			"action.probe": "Probe",
			"action.authorize": "Authorize",
			"action.signOut": "Sign out",
			"action.cancelAuthorization": "Cancel authorization",
			"action.viewTools": "View tools",
			"action.copyJson": "Copy JSON",
			"action.enable": "Enable",
			"action.disable": "Disable",
			"notice.restarted": "Restart requested for {name}",
			"notice.saved": "Saved {name}",
			"notice.deleted": "Deleted {name}",
			"notice.enabled": "Enabled {name}",
			"notice.disabled": "Disabled {name}",
			"notice.authorized": "Authorization completed",
			"notice.signedOut": "Signed out of {name}",
			"notice.probeOk": "Probe of {name} succeeded",
			"notice.probeFailed": "Probe of {name} failed",
			"notice.copied": "Copied to clipboard",
			"notice.copyFailed": "Copy failed; select the text manually",
			"notice.failed": "Operation failed: {message}",
			"confirm.deleteTitle": "Delete MCP server",
			"confirm.deleteDescription": "Removes \"{name}\" from its mcp.json and immediately withdraws its registration and tools. This cannot be undone.",
			"confirm.acknowledge": "I understand the impact",
			"confirm.cancel": "Cancel",
			"confirm.delete": "Delete server",
			"card.stdio": "stdio",
			"card.http": "streamable-http",
			"card.command": "Command",
			"card.url": "URL",
			"card.args": "Arguments",
			"card.cwd": "Working directory",
			"card.env": "Environment",
			"card.headers": "Headers",
			"card.tools": "Tools",
			"card.toolCount": "{count} tools",
			"card.noTools": "No registered tools right now",
			"card.onDemand": "On demand: tools stay out of the list until an agent loads them; probe the server to see what it advertises.",
			"card.timeouts": "Startup {startup} ms · Close {close} ms · Call {call} ms",
			"card.reconnect": "Reconnect: {initial}→{max} ms, {attempts} attempts",
			"card.reconnectOff": "Reconnect: off",
			"card.oauth": "OAuth",
			"card.readonly": "Read-only file",
			"card.shadowed": "Shadowed by a definition in {scopes}",
			"card.path": "Source file",
			"card.disabledTools": "{count} tools disabled",
			"card.entryHint": "Official config entry; saving makes mcp-manager rebuild the instance.",
			"card.toolPolicy": "Tool policy",
			"tool.search": "Search tools",
			"tool.parameters": "Parameter schema",
			"tool.enable": "Enable tool",
			"tool.disable": "Disable tool",
			"editor.new": "Add MCP server",
			"editor.edit": "Edit {name}",
			"editor.target": "Write to",
			"editor.targetEntry": "Official config entry (recommended)",
			"editor.targetProject": "Project .dsh/mcp.json",
			"editor.targetProfile": "Profile mcp.json",
			"editor.targetUser": "User mcp.json",
			"editor.targetHintEntry": "Stored in mcp-manager.servers and governed by the official manager; reusable in every environment.",
			"editor.targetHintFile": "Stored in a file shared with other MCP clients; this plugin keeps the registration.",
			"editor.name": "Name",
			"editor.nameHint": "Letters, digits, underscore, and dash, up to 32 characters; also the tool namespace.",
			"editor.transport": "Transport",
			"editor.command": "Command",
			"editor.args": "Arguments",
			"editor.addArg": "Add argument",
			"editor.removeArg": "Remove argument",
			"editor.cwd": "Working directory",
			"editor.url": "URL",
			"editor.env": "Environment",
			"editor.headers": "Headers",
			"editor.addRow": "Add row",
			"editor.removeRow": "Remove row",
			"editor.keyPlaceholder": "Name",
			"editor.valuePlaceholder": "Value or ${env:NAME}",
			"editor.secret": "Secret value",
			"editor.secretKept": "Saved; leave empty to keep it",
			"editor.secretHint": "Saved secrets are never shown; leave a field empty to keep its value.",
			"editor.templated": "Environment template",
			"editor.credentialTemplate": "Credential template, resolved by dsh",
			"editor.advanced": "Advanced",
			"editor.startupTimeout": "Startup timeout (ms)",
			"editor.closeTimeout": "Close timeout (ms)",
			"editor.toolCallTimeout": "Tool call timeout (ms)",
			"editor.reconnect": "Automatic reconnect",
			"editor.reconnectEnabled": "Enable automatic reconnect",
			"editor.initialDelay": "First delay (ms)",
			"editor.maxDelay": "Max delay (ms)",
			"editor.maxAttempts": "Max attempts",
			"editor.toolLoading": "Tool loading",
			"editor.eager": "Eager",
			"editor.onDemand": "On demand",
			"editor.onDemandHint": "On demand registers only a loader; the model fetches the catalogue when it needs it.",
			"editor.oauth": "OAuth",
			"editor.oauthAdd": "Configure OAuth",
			"editor.oauthRemove": "Remove OAuth",
			"editor.credentialKey": "Credential key",
			"editor.clientId": "Client ID (optional)",
			"editor.scope": "Scope (optional)",
			"editor.requestTimeout": "Request timeout (ms)",
			"editor.authorizationTimeout": "Authorization timeout (ms)",
			"editor.oauthHint": "The credential value lives in dsh credentials; only the reference is stored here.",
			"editor.invalid.required": "Required",
			"editor.invalid.name": "Name must match [-A-Za-z0-9_]{1,32}",
			"editor.invalid.command": "A stdio server needs a command",
			"editor.invalid.url": "Enter an http(s) URL",
			"editor.invalid.timeout": "Enter an integer from 1 to 2147483647",
			"editor.invalid.envKey": "Environment/header names must not be empty",
			"editor.invalid.credential": "A credential template must be the whole value",
			"editor.conflict": "Save rejected: the configuration changed elsewhere",
			"editor.conflictHint": "The panel re-read the latest configuration; review it and save again.",
			"editor.noWorkspace": "No project workspace is available yet",
			"editor.noProject": "Select a project before choosing a project-level mcp.json.",
			"editor.noEntryWrite": "The official mcp-manager is unavailable: config entries cannot be written. Use mcp.json instead.",
			"probe.title": "Probe {name}",
			"probe.running": "Connecting and reading the tool catalogue…",
			"probe.success": "Probe succeeded",
			"probe.failure": "Probe failed",
			"probe.stage": "Stage",
			"probe.duration": "Duration",
			"probe.server": "Server",
			"probe.tools": "Advertised tools",
			"probe.truncated": "Tool list truncated",
			"probe.closeConfirmed": "Transport closure confirmed",
			"probe.cleanupError": "Cleanup error: {error}",
			"probe.again": "Probe again",
			"probe.done": "Done",
			"probe.stageConnect": "Connect",
			"probe.stageList": "List tools",
			"probe.empty": "The server advertised no tools",
			"oauth.title": "Authorization for {name}",
			"oauth.starting": "Starting authorization…",
			"oauth.waitingBrowser": "Waiting for the browser to finish",
			"oauth.exchanging": "Exchanging the token…",
			"oauth.committing": "Saving the authorization…",
			"oauth.authorized": "Authorized",
			"oauth.cancelled": "Authorization cancelled",
			"oauth.failed": "Authorization failed: {error}",
			"oauth.open": "Open authorization page",
			"oauth.cancel": "Cancel authorization",
			"oauth.done": "Done",
			"oauth.signOut": "Sign out",
			"oauth.hint": "Authorize in a browser on the computer running DSH. The server reconnects when it completes.",
			"oauth.startFailed": "Could not start authorization: {message}",
			"sources.title": "File sources",
			"sources.hint": "Same-name servers resolve project → profile → user; a higher scope shadows the lower ones.",
			"sources.writable": "Writable",
			"sources.readonly": "Read-only",
			"sources.missing": "Not created yet",
			"sources.count": "{count} servers",
			"sources.problems": "{count} invalid entries",
			"sources.compat": "Compat file",
			"sources.error": "Read failed: {error}",
			"sources.open": "View",
			"empty.title": "No MCP servers yet",
			"empty.description": "Add a server, or put an existing client's mcpServers map into ~/.dsh/mcp.json.",
			"empty.action": "Add the first server",
			"error.snapshot": "Could not read the MCP configuration: {message}",
			"error.stream": "The server status stream is disconnected; waiting to reconnect…",
			"error.upstream": "The official mcp-manager form is unavailable, so config entries cannot be edited.",
			"error.write": "Save failed: {message}",
			"loading.servers": "Reading the MCP configuration…",
			"loading.tools": "Reading tools…",
			"panel.toolsNote": "A tool switch only changes what this plugin exposes to the model; the server stays connected.",
			"panel.entryUnavailable": "No official mcp-manager configuration detected; config entries are read-only.",
			"panel.scopeNote": "A project-level server only applies inside that workspace."
		};
		//#endregion
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
		/** The Loader entry id this plugin's Host half is mounted under, and its settings namespace. */
		const MCP_MANAGER_NAMESPACE = "dsh-mcp-manager";
		/**
		* The official MCP manager's Loader entry id in the `dsh-web-app` composition.
		* It is the settings namespace the panel writes `servers` through.
		*/
		const MCP_UPSTREAM_NAMESPACE = "mcp-manager";
		function isRpcResult(value) {
			if (typeof value !== "object" || value === null) return false;
			const record = value;
			if (record.ok === true) return "value" in record;
			if (record.ok !== false || typeof record.error !== "object" || record.error === null) return false;
			const error = record.error;
			return typeof error.code === "string" && typeof error.message === "string";
		}
		//#endregion
		//#region lib/types/client/api.js
		/** Typed browser wrapper over the authenticated Host Connection RPC channel. */
		var McpManagerRpcError = class extends Error {
			code;
			constructor(error) {
				super(error.message);
				this.name = "McpManagerRpcError";
				this.code = error.code;
			}
		};
		function createManagerApi(ctx) {
			const rpc = ctx.get("connection").rpc;
			const call = async (endpoint, payload, signal) => {
				const result = await rpc.call(MCP_MANAGER_API_CHANNEL, `${MCP_MANAGER_ENDPOINT_PREFIX}/${endpoint}`, payload, signal);
				if (!isRpcResult(result)) throw new Error("MCP manager returned an invalid RPC response");
				if (!result.ok) throw new McpManagerRpcError(result.error);
				return result.value;
			};
			return {
				snapshot: (request = {}, signal) => call("snapshot", request, signal),
				upsertServer: (request, signal) => call("upsertServer", request, signal),
				removeServer: (request, signal) => call("removeServer", request, signal),
				setServerEnabled: (request, signal) => call("setServerEnabled", request, signal),
				authorize: (request, signal) => call("authorize", request, signal),
				cancelAuthorization: (request, signal) => call("cancelAuthorization", request, signal),
				signOut: (request, signal) => call("signOut", request, signal)
			};
		}
		//#endregion
		//#region lib/types/client/entry-form.js
		/**
		* The two official shared settings forms this page writes through.
		*
		* `mcp-manager` owns the official server entries; `dsh-mcp-manager` is this
		* plugin's own entry and holds the per-server disabled tool names. Both are
		* volatile, revision-checked documents managed by the Host, so the page never
		* posts a private configuration protocol for them.
		*/
		/**
		* Build the writer for the official `mcp-manager` entry.
		* @param form - the shared form for that entry id.
		* @returns the page's upstream form face.
		*/
		function createUpstreamForm(form) {
			return {
				namespace: MCP_UPSTREAM_NAMESPACE,
				snapshot: () => {
					const snapshot = form.getSnapshot();
					return {
						status: snapshot.status,
						writable: snapshot.writable,
						...snapshot.value === void 0 ? {} : { value: snapshot.value },
						...snapshot.revision === void 0 ? {} : { revision: snapshot.revision }
					};
				},
				subscribe: (listener) => form.subscribe(listener),
				setServer: (name, entry) => form.mutate([{
					op: "set",
					path: ["servers", name],
					value: entry
				}]),
				removeServer: (name) => form.mutate([{
					op: "unset",
					path: ["servers", name]
				}]),
				setEnabled: (name, enabled) => {
					const current = form.getSnapshot().value?.servers?.[name];
					if (current === void 0) return Promise.resolve(false);
					return form.mutate([{
						op: "set",
						path: ["servers", name],
						value: {
							...current,
							enabled
						}
					}]);
				}
			};
		}
		/**
		* Build the writer for this plugin's own entry.
		* @param form - the shared form for the `dsh-mcp-manager` entry id.
		* @returns the page's own form face.
		*/
		function createOwnForm(form) {
			return {
				namespace: MCP_MANAGER_NAMESPACE,
				snapshot: () => {
					const snapshot = form.getSnapshot();
					return {
						status: snapshot.status,
						writable: snapshot.writable,
						...snapshot.value === void 0 ? {} : { value: snapshot.value },
						...snapshot.revision === void 0 ? {} : { revision: snapshot.revision }
					};
				},
				subscribe: (listener) => form.subscribe(listener),
				setDisabledTools: (server, names) => names.length === 0 ? form.mutate([{
					op: "unset",
					path: ["disabledTools", server]
				}]) : form.mutate([{
					op: "set",
					path: ["disabledTools", server],
					value: [...names]
				}])
			};
		}
		//#endregion
		//#region lib/types/client/manager-store.js
		/**
		* The panel's data layer, held in the official client store.
		*
		* Three sources feed one reference-stable snapshot:
		*
		* 1. the Host's `snapshot` RPC (file scopes, registration outcomes, tools);
		* 2. the official `mcpManager.watch` stream (live status and OAuth attempts);
		* 3. the two official shared forms (`mcp-manager` entries and this plugin's
		*    own `disabledTools`), which the Host writes through the settings service.
		*
		* Live status is push-based, so the file snapshot can poll at a calm interval
		* without making the page feel stale. Every operation publishes through this
		* store, and a monotonic sequence keeps a slow read from overwriting a newer
		* one.
		*/
		/** How often a visible page re-reads the file scopes and tools. */
		const POLL_INTERVAL_MS = 2e3;
		/**
		* Create the store and start its read loop.
		* @param ctx - the browser plugin context (connection, remote, forms).
		* @param api - the Host RPC face.
		* @param upstream - the official entry form face.
		* @param own - this plugin's entry form face.
		* @param translate - the page translator, used for notices.
		*/
		function createManagerStore(ctx, api, upstream, own, translate) {
			const initial = {
				status: "loading",
				snapshot: void 0,
				error: void 0,
				pollFailed: false,
				busy: false,
				notice: void 0,
				managed: [],
				streamFailed: false,
				upstream: upstream.snapshot(),
				own: own.snapshot(),
				projectPath: void 0,
				updatedAt: void 0
			};
			const state = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(initial);
			let disposed = false;
			let sequence = 0;
			let pollTimer;
			let stream;
			let streamAbort;
			const disposers = [];
			const t = translate;
			const patch = (mutate) => {
				state.update(mutate);
			};
			const requestRefresh = () => {
				if (disposed) return;
				const current = state.getSnapshot();
				const request = ++sequence;
				api.snapshot(current.projectPath === void 0 ? {} : { projectPath: current.projectPath }, streamAbort?.signal).then((snapshot) => {
					if (disposed || request !== sequence) return;
					patch((draft) => {
						draft.status = "ready";
						draft.snapshot = snapshot;
						draft.error = void 0;
						draft.pollFailed = false;
						draft.projectPath = snapshot.projectPath;
						draft.updatedAt = Date.now();
					});
				}).catch((error) => {
					if (disposed || request !== sequence) return;
					const message = errorMessage(error);
					patch((draft) => {
						if (draft.snapshot === void 0) {
							draft.status = "error";
							draft.error = message;
						} else draft.pollFailed = true;
					});
				});
			};
			const begin = () => {
				patch((draft) => {
					draft.busy = true;
				});
			};
			const end = () => {
				patch((draft) => {
					draft.busy = false;
				});
			};
			const succeed = (text) => {
				patch((draft) => {
					draft.notice = {
						tone: "success",
						text
					};
				});
			};
			const fail = (error) => {
				patch((draft) => {
					draft.notice = {
						tone: "error",
						text: t("notice.failed", { message: errorMessage(error) })
					};
				});
			};
			const disposeStream = () => {
				try {
					stream?.dispose?.();
				} catch {}
				stream = void 0;
				try {
					streamAbort?.abort();
				} catch {}
				streamAbort = void 0;
			};
			const openStream = () => {
				if (disposed) return;
				disposeStream();
				const remote = ctx.remote;
				streamAbort = new AbortController();
				const handle = remote.$stream({
					name: "MCP server status",
					open: (signal) => remote.mcpManager.watch(signal),
					ended: () => /* @__PURE__ */ new Error("MCP server status stream ended"),
					carrierFailed: () => {
						if (!disposed) patch((draft) => {
							draft.streamFailed = true;
						});
					}
				});
				stream = handle;
				(async () => {
					try {
						for await (const item of handle) {
							if (disposed) return;
							patch((draft) => {
								draft.managed = item.value;
								draft.streamFailed = false;
							});
							item.accept();
						}
					} catch {
						if (!disposed) patch((draft) => {
							draft.streamFailed = true;
						});
					}
				})();
			};
			const startPolling = () => {
				if (pollTimer !== void 0) return;
				pollTimer = setInterval(() => {
					if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
					requestRefresh();
				}, POLL_INTERVAL_MS);
			};
			const applyOperation = async (operation, success) => {
				if (state.getSnapshot().busy) return false;
				begin();
				try {
					await operation();
					succeed(success);
					requestRefresh();
					return true;
				} catch (error) {
					fail(error);
					return false;
				} finally {
					end();
				}
			};
			disposers.push(upstream.subscribe(() => {
				patch((draft) => {
					draft.upstream = upstream.snapshot();
				});
			}));
			disposers.push(own.subscribe(() => {
				patch((draft) => {
					draft.own = own.snapshot();
				});
			}));
			const onReset = () => {
				requestRefresh();
				openStream();
			};
			disposers.push(ctx.on("connection/reset", onReset));
			const onVisibility = () => {
				if (document.visibilityState === "visible") requestRefresh();
			};
			if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
			disposers.push(() => {
				if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
			});
			openStream();
			requestRefresh();
			startPolling();
			const store = {
				state,
				selectProject: (projectPath) => {
					patch((draft) => {
						draft.projectPath = projectPath;
					});
					requestRefresh();
				},
				refresh: requestRefresh,
				notify: (text, tone = "success") => {
					patch((draft) => {
						draft.notice = {
							tone,
							text
						};
					});
				},
				clearNotice: () => {
					patch((draft) => {
						draft.notice = void 0;
					});
				},
				upsertServer: (request) => applyOperation(async () => {
					await api.upsertServer({
						scope: request.scope,
						server: request.server,
						...currentProject(state)
					});
				}, t("notice.saved", { name: request.server.id })),
				removeServer: (row) => {
					if (row.kind === "entry") return store.removeEntry(row.name);
					return applyOperation(async () => {
						await api.removeServer({
							id: row.name,
							...currentProject(state)
						});
					}, t("notice.deleted", { name: row.name }));
				},
				setEnabled: (row, enabled) => {
					if (row.kind === "entry") return store.setEntryEnabled(row.name, enabled);
					return applyOperation(async () => {
						await api.setServerEnabled({
							id: row.name,
							enabled,
							...currentProject(state)
						});
					}, t(enabled ? "notice.enabled" : "notice.disabled", { name: row.name }));
				},
				restart: (name) => applyOperation(async () => {
					const result = await ctx.remote.mcpManager.restart(name);
					if (!result.ok) throw new Error(remoteErrorText(result));
				}, t("notice.restarted", { name })),
				probe: async (name) => {
					const remote = ctx.remote.mcpManager;
					const controller = new AbortController();
					const timer = setTimeout(() => {
						controller.abort();
					}, 2e4);
					try {
						const result = await remote.probe(name, controller.signal);
						if (!result.ok || result.value === void 0) {
							patch((draft) => {
								draft.notice = {
									tone: "error",
									text: t("notice.probeFailed", { name })
								};
							});
							return {
								ok: false,
								message: remoteErrorText(result)
							};
						}
						patch((draft) => {
							draft.notice = result.value?.ok === true ? {
								tone: "success",
								text: t("notice.probeOk", { name })
							} : {
								tone: "error",
								text: t("notice.probeFailed", { name })
							};
						});
						return {
							ok: true,
							result: result.value
						};
					} catch (error) {
						fail(error);
						return {
							ok: false,
							message: errorMessage(error)
						};
					} finally {
						clearTimeout(timer);
					}
				},
				authorize: async (name) => {
					begin();
					try {
						const result = await api.authorize({ name });
						patch((draft) => {
							draft.notice = {
								tone: "success",
								text: t("notice.authorized")
							};
						});
						requestRefresh();
						return result;
					} catch (error) {
						fail(error);
						return;
					} finally {
						end();
					}
				},
				cancelAuthorization: (name, id) => applyOperation(async () => {
					await api.cancelAuthorization({
						name,
						id
					});
				}, t("notice.authorized")),
				signOut: (name) => applyOperation(async () => {
					await api.signOut({ name });
				}, t("notice.signedOut", { name })),
				saveEntry: (name, entry) => applyOperation(async () => {
					if (!await upstream.setServer(name, entry)) throw new Error(t("editor.conflict"));
				}, t("notice.saved", { name })),
				removeEntry: (name) => applyOperation(async () => {
					if (!await upstream.removeServer(name)) throw new Error(t("editor.conflict"));
				}, t("notice.deleted", { name })),
				setEntryEnabled: (name, enabled) => applyOperation(async () => {
					if (!await upstream.setEnabled(name, enabled)) throw new Error(t("editor.conflict"));
				}, t(enabled ? "notice.enabled" : "notice.disabled", { name })),
				setToolEnabled: (server, tool, enabled) => {
					const current = state.getSnapshot().own.value?.disabledTools?.[server] ?? [];
					const next = enabled ? current.filter((name) => name !== tool) : [.../* @__PURE__ */ new Set([...current, tool])];
					begin();
					try {
						return own.setDisabledTools(server, next).then((accepted) => {
							if (accepted) requestRefresh();
							return accepted;
						}, () => false).finally(() => {
							end();
						});
					} catch {
						end();
						return Promise.resolve(false);
					}
				},
				dispose: () => {
					if (disposed) return;
					disposed = true;
					if (pollTimer !== void 0) clearInterval(pollTimer);
					pollTimer = void 0;
					for (const dispose of disposers.splice(0)) dispose();
					disposeStream();
				}
			};
			return store;
		}
		/** The project target every file write carries, or nothing when none is selected. */
		function currentProject(state) {
			const projectPath = state.getSnapshot().projectPath;
			return projectPath === void 0 ? {} : { projectPath };
		}
		function remoteErrorText(result) {
			const error = result.error;
			if (error === void 0) return "remote call failed";
			return error.message ?? error.code ?? "remote call failed";
		}
		function errorMessage(error) {
			return error instanceof Error ? error.message : String(error);
		}
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
		/** The `mcp-client` credential scope the manager requires for OAuth entries. */
		const CREDENTIAL_KEY_PATTERN = /^mcp-client\/[^/\s]+$/u;
		/** One `${credential:REF}` token; the whole value must be the token when present. */
		const CREDENTIAL_TEMPLATE_PATTERN = /\$\{credential:[^}]+\}/u;
		/** Whether a stored value references the official credential store. */
		function isCredentialTemplate(value) {
			return CREDENTIAL_TEMPLATE_PATTERN.test(value);
		}
		//#endregion
		//#region lib/types/client/draft.js
		/** The editor's form model: strings in, a validated patch or entry out. */
		const SERVER_ID_RE = /^[-A-Za-z0-9_]{1,32}$/u;
		/**
		* Build an editing draft.
		* @param row - the server to edit, or `undefined` for a new one.
		* @param defaultTarget - where a new server is written when the official form is unavailable.
		* @returns the draft.
		*/
		function createDraft(row, defaultTarget = "entry") {
			if (row === void 0) return {
				target: defaultTarget,
				name: "",
				enabled: true,
				transport: "stdio",
				command: "",
				args: [],
				cwd: "",
				url: "",
				env: [],
				headers: [],
				toolCallTimeoutMs: String(DEFAULT_TOOL_CALL_TIMEOUT_MS),
				startupTimeoutMs: String(DEFAULT_STARTUP_TIMEOUT_MS),
				closeTimeoutMs: String(DEFAULT_CLOSE_TIMEOUT_MS),
				reconnectEnabled: DEFAULT_RECONNECT.enabled,
				reconnectInitial: String(DEFAULT_RECONNECT.initialDelayMs),
				reconnectMax: String(DEFAULT_RECONNECT.maxDelayMs),
				reconnectAttempts: String(DEFAULT_RECONNECT.maxAttempts),
				toolLoading: "eager",
				oauthEnabled: false,
				oauthCredentialKey: "",
				oauthClientId: "",
				oauthScope: "",
				oauthRequestTimeout: String(DEFAULT_OAUTH_REQUEST_TIMEOUT_MS),
				oauthAuthorizationTimeout: String(DEFAULT_OAUTH_AUTHORIZATION_TIMEOUT_MS)
			};
			return {
				target: row.kind === "entry" ? "entry" : row.scope ?? "profile",
				name: row.name,
				enabled: row.enabled,
				transport: row.transport,
				command: row.command,
				args: [...row.args],
				cwd: row.cwd,
				url: row.url,
				env: draftRows(row.env),
				headers: draftRows(row.headers),
				toolCallTimeoutMs: String(row.toolCallTimeoutMs),
				startupTimeoutMs: String(row.startupTimeoutMs),
				closeTimeoutMs: String(row.closeTimeoutMs),
				reconnectEnabled: row.reconnect.enabled,
				reconnectInitial: String(row.reconnect.initialDelayMs),
				reconnectMax: String(row.reconnect.maxDelayMs),
				reconnectAttempts: String(row.reconnect.maxAttempts),
				toolLoading: row.toolLoading,
				oauthEnabled: row.oauth !== void 0,
				oauthCredentialKey: row.oauth?.credentialKey ?? "",
				oauthClientId: row.oauth?.clientId ?? "",
				oauthScope: row.oauth?.scope ?? "",
				oauthRequestTimeout: String(row.oauth?.requestTimeoutMs ?? 1e4),
				oauthAuthorizationTimeout: String(row.oauth?.authorizationTimeoutMs ?? 6e5)
			};
		}
		function draftRows(rows) {
			return rows.map((row) => ({
				key: row.key,
				value: row.state === void 0 ? row.value ?? "" : "",
				secret: row.state?.sensitive ?? false,
				configured: row.state?.set ?? false
			}));
		}
		/** Field-level issues in display order; empty means the draft is writable. */
		function validateDraft(draft) {
			const issues = [];
			if (!SERVER_ID_RE.test(draft.name)) issues.push("name");
			if (draft.transport === "stdio" && draft.command.trim() === "") issues.push("command");
			if (draft.transport === "streamable-http" && !/^https?:\/\/[^\s]+$/u.test(draft.url.trim())) issues.push("url");
			for (const value of [
				draft.toolCallTimeoutMs,
				draft.startupTimeoutMs,
				draft.closeTimeoutMs
			]) if (!validTimeout(value)) issues.push("timeout");
			if (draft.reconnectEnabled) {
				for (const value of [
					draft.reconnectInitial,
					draft.reconnectMax,
					draft.reconnectAttempts
				]) if (!validTimeout(value)) issues.push("timeout");
				const initial = Number(draft.reconnectInitial);
				const max = Number(draft.reconnectMax);
				if (Number.isFinite(initial) && Number.isFinite(max) && initial > max) issues.push("reconnect");
			}
			for (const row of [...draft.env, ...draft.headers]) if (row.key.trim() === "") issues.push("envKey");
			if (draft.oauthEnabled) {
				if (!CREDENTIAL_KEY_PATTERN.test(draft.oauthCredentialKey)) issues.push("oauthKey");
				if (!validTimeout(draft.oauthRequestTimeout) || !validTimeout(draft.oauthAuthorizationTimeout)) issues.push("timeout");
			}
			for (const row of [...draft.env, ...draft.headers]) if (row.value !== "" && row.value.trim() !== row.value && isCredentialTemplate(row.value)) issues.push("credential");
			return [...new Set(issues)];
		}
		function validTimeout(value) {
			const parsed = Number(value);
			return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 2147483647;
		}
		/** The scope a file target writes to. */
		function scopeOf(target) {
			return target === "entry" ? "profile" : target;
		}
		/**
		* Build the RPC patch for a file target.
		* @param draft - a draft that passed {@link validateDraft}.
		* @returns the patch, with masked secrets marked keep and untouched rows omitted.
		*/
		function patchFromDraft(draft) {
			const patch = {
				id: draft.name,
				transport: draft.transport,
				enabled: draft.enabled,
				args: [...draft.args],
				toolCallTimeoutMs: Number(draft.toolCallTimeoutMs),
				startupTimeoutMs: Number(draft.startupTimeoutMs),
				closeTimeoutMs: Number(draft.closeTimeoutMs),
				reconnect: reconnectOf(draft),
				toolLoading: draft.toolLoading
			};
			if (draft.transport === "stdio") {
				patch.command = draft.command;
				patch.cwd = draft.cwd;
				patch.env = secretMap(draft.env);
				patch.envSensitive = draft.env.filter((row) => row.secret && row.key.trim() !== "").map((row) => row.key);
			} else {
				patch.url = draft.url;
				patch.headers = secretMap(draft.headers);
				patch.headerSensitive = draft.headers.filter((row) => row.secret && row.key.trim() !== "").map((row) => row.key);
				patch.oauth = oauthOf(draft);
			}
			return patch;
		}
		/**
		* Build a complete official manager entry for an entry target.
		* @param draft - a draft that passed {@link validateDraft}.
		* @returns the entry; transport-specific fields of the other transport are absent.
		*/
		function entryFromDraft(draft) {
			const entry = {
				transport: draft.transport,
				enabled: draft.enabled,
				toolCallTimeoutMs: Number(draft.toolCallTimeoutMs),
				startupTimeoutMs: Number(draft.startupTimeoutMs),
				closeTimeoutMs: Number(draft.closeTimeoutMs),
				reconnect: reconnectOf(draft),
				toolLoading: draft.toolLoading
			};
			if (draft.transport === "stdio") {
				entry.command = draft.command;
				entry.args = [...draft.args];
				if (draft.cwd.trim() !== "") entry.cwd = draft.cwd;
				const env = plainMap(draft.env);
				if (Object.keys(env).length > 0) entry.env = env;
			} else {
				entry.url = draft.url;
				const headers = plainMap(draft.headers);
				if (Object.keys(headers).length > 0) entry.headers = headers;
				const oauth = oauthOf(draft);
				if (oauth !== null && oauth !== void 0) entry.oauth = oauth;
			}
			return entry;
		}
		function reconnectOf(draft) {
			return {
				enabled: draft.reconnectEnabled,
				initialDelayMs: Number(draft.reconnectInitial),
				maxDelayMs: Number(draft.reconnectMax),
				maxAttempts: Number(draft.reconnectAttempts)
			};
		}
		function oauthOf(draft) {
			if (!draft.oauthEnabled || draft.transport !== "streamable-http") return null;
			const policy = {
				credentialKey: draft.oauthCredentialKey,
				requestTimeoutMs: Number(draft.oauthRequestTimeout),
				authorizationTimeoutMs: Number(draft.oauthAuthorizationTimeout)
			};
			if (draft.oauthClientId.trim() !== "") policy.clientId = draft.oauthClientId;
			if (draft.oauthScope.trim() !== "") policy.scope = draft.oauthScope;
			return policy;
		}
		function secretMap(rows) {
			const map = {};
			for (const row of rows) {
				const key = row.key.trim();
				if (key === "") continue;
				if (row.configured && row.value === "") {
					map[key] = {};
					continue;
				}
				map[key] = row.value;
			}
			return map;
		}
		function plainMap(rows) {
			const map = {};
			for (const row of rows) {
				const key = row.key.trim();
				if (key !== "") map[key] = row.value;
			}
			return map;
		}
		/** The locale key explaining one issue. */
		function issueKey(issue) {
			switch (issue) {
				case "name": return "editor.invalid.name";
				case "command": return "editor.invalid.command";
				case "url": return "editor.invalid.url";
				case "timeout": return "editor.invalid.timeout";
				case "envKey": return "editor.invalid.envKey";
				case "credential": return "editor.invalid.credential";
				case "oauthKey": return "editor.invalid.credential";
				case "reconnect": return "editor.invalid.timeout";
			}
		}
		//#endregion
		//#region lib/types/client/summary.js
		/** Merge the three data sources (file snapshot, official manager stream, entry form) into one row model. */
		/**
		* Merge every source into panel rows.
		* @param snapshot - the Host's file view, or `undefined` while loading.
		* @param managed - the official manager's status stream.
		* @param entryServers - `mcp-manager.servers` values from the shared form.
		* @param disabledTools - this plugin's per-server disabled tool names.
		* @param entryWritable - whether the official form accepts writes.
		* @returns entry servers first, then file servers, each sorted by name.
		*/
		function buildSummaries(snapshot, managed, entryServers, disabledTools, entryWritable) {
			const runtimes = new Map(managed.map((view) => [view.name, view]));
			const fileServers = snapshot?.servers ?? [];
			const toolsByServer = /* @__PURE__ */ new Map();
			for (const tool of snapshot?.tools ?? []) {
				const list = toolsByServer.get(tool.serverId) ?? [];
				list.push(tool);
				toolsByServer.set(tool.serverId, list);
			}
			const fileNames = new Set(fileServers.map((server) => server.id));
			const entryNames = new Set(Object.keys(entryServers));
			const rows = [];
			for (const name of [...entryNames].sort((left, right) => left.localeCompare(right))) {
				const entry = entryServers[name] ?? {};
				rows.push(entrySummary(name, entry, runtimes.get(name), toolsByServer.get(name) ?? [], disabledTools[name] ?? [], entryWritable, fileNames.has(name)));
			}
			for (const server of fileServers) rows.push(fileSummary(server, runtimes.get(server.id), toolsByServer.get(server.id) ?? [], disabledTools[server.id] ?? [], entryNames.has(server.id)));
			return rows;
		}
		function entrySummary(name, entry, runtime, tools, disabled, writable, conflict) {
			const transport = entry.transport === "streamable-http" ? "streamable-http" : "stdio";
			return {
				name,
				kind: "entry",
				label: name,
				enabled: entry.enabled !== false,
				transport,
				writable,
				compat: false,
				shadowed: [],
				command: entry.command ?? "",
				args: [...entry.args ?? []],
				cwd: entry.cwd ?? "",
				url: entry.url ?? "",
				env: mapRows(entry.env),
				headers: mapRows(entry.headers),
				toolCallTimeoutMs: entry.toolCallTimeoutMs ?? 6e4,
				startupTimeoutMs: entry.startupTimeoutMs ?? 3e4,
				closeTimeoutMs: entry.closeTimeoutMs ?? 5e3,
				reconnect: {
					...DEFAULT_RECONNECT,
					...entry.reconnect
				},
				toolLoading: entry.toolLoading === "on-demand" ? "on-demand" : "eager",
				...entry.oauth === void 0 ? {} : { oauth: entry.oauth },
				...runtime === void 0 ? {} : { runtime },
				tools,
				disabledTools: disabled,
				entry,
				conflict
			};
		}
		function fileSummary(server, runtime, tools, disabled, conflict) {
			return {
				name: server.id,
				kind: "file",
				label: server.label,
				enabled: server.enabled,
				transport: server.transport,
				scope: server.scope,
				path: server.path,
				writable: server.writable,
				compat: server.scope === "project" && server.writable === false,
				shadowed: server.shadowed,
				command: server.command,
				args: [...server.args],
				cwd: server.cwd,
				url: server.url,
				env: secretRows(server.env),
				headers: secretRows(server.headers),
				toolCallTimeoutMs: server.toolCallTimeoutMs,
				startupTimeoutMs: server.startupTimeoutMs,
				closeTimeoutMs: server.closeTimeoutMs,
				reconnect: { ...server.reconnect },
				toolLoading: server.toolLoading,
				...server.oauth === void 0 ? {} : { oauth: server.oauth },
				templates: server.templates,
				registration: server.registration,
				...runtime === void 0 ? {} : { runtime },
				tools,
				disabledTools: disabled,
				file: server,
				conflict
			};
		}
		function mapRows(values) {
			return Object.entries(values ?? {}).map(([key, value]) => ({
				key,
				value
			}));
		}
		function secretRows(values) {
			return Object.entries(values).map(([key, state]) => ({
				key,
				state
			}));
		}
		/** The status bucket a row belongs to, for the status filter. */
		function statusBucket(runtime) {
			const state = runtime?.status.state;
			if (state === "connected") return "connected";
			if (state === "connecting" || state === "reconnecting") return "busy";
			if (state === "waiting-credentials" || state === "waiting-authorization" || state === "failed") return "attention";
			if (state === "disabled") return "disabled";
			return "unknown";
		}
		/** Filter rows by search text, source, and status bucket. */
		function filterSummaries(rows, query, source, status) {
			const needle = query.trim().toLocaleLowerCase();
			return rows.filter((row) => {
				if (source !== "all" && row.kind !== source) return false;
				if (status !== "all" && statusBucket(row.runtime) !== status) return false;
				if (needle === "") return true;
				return [
					row.name,
					row.label,
					row.command,
					row.url,
					row.cwd,
					...row.args,
					...row.env.map((entry) => entry.key),
					...row.headers.map((entry) => entry.key),
					...row.tools.map((tool) => `${tool.name} ${tool.description}`),
					row.scope ?? ""
				].join("\n").toLocaleLowerCase().includes(needle);
			});
		}
		/**
		* Serialize one row as the `mcp.json` entry it would be written as, for the copy action.
		* @param row - the row to render.
		* @returns pretty-printed JSON.
		*/
		function rowToJson(row) {
			const entry = { type: row.transport === "stdio" ? "stdio" : "http" };
			if (row.transport === "stdio") {
				entry.command = row.command;
				entry.args = [...row.args];
				if (row.cwd !== "") entry.cwd = row.cwd;
				if (row.env.length > 0) entry.env = Object.fromEntries(row.env.map((item) => [item.key, item.value ?? ""]));
			} else {
				entry.url = row.url;
				if (row.headers.length > 0) entry.headers = Object.fromEntries(row.headers.map((item) => [item.key, item.value ?? ""]));
			}
			if (!row.enabled) entry.enabled = false;
			if (row.toolLoading !== "eager") entry.toolLoading = row.toolLoading;
			if (row.oauth !== void 0) entry.oauth = { ...row.oauth };
			return `${JSON.stringify(entry, null, 2)}\n`;
		}
		//#endregion
		//#region lib/types/client/status.js
		/** Runtime status → panel vocabulary. Pure: the caller passes the translator and clock. */
		/**
		* Describe one managed server's status.
		* @param view - the manager's view, or `undefined` when the status stream has not delivered it yet.
		* @param t - the page translator.
		* @param now - current epoch milliseconds, for relative times.
		* @returns the state dot tone, the short label, and the explanatory line.
		*/
		function describeStatus(view, t, now = Date.now()) {
			if (view === void 0) return {
				tone: "idle",
				label: t("status.unknown")
			};
			return describeStatusValue(view.status, t, now);
		}
		/** Describe one status value; exported for tests that do not build a view. */
		function describeStatusValue(status, t, now = Date.now()) {
			switch (status.state) {
				case "connected": return {
					tone: "done",
					label: t("status.connected"),
					detail: t("detail.connected", {
						count: status.toolCount,
						time: clock(status.connectedAt)
					})
				};
				case "connecting": return {
					tone: "ongoing",
					label: t("status.connecting"),
					detail: t("detail.connecting", { attempt: status.attempt + 1 })
				};
				case "reconnecting": return {
					tone: "ongoing",
					label: t("status.reconnecting"),
					detail: t("detail.reconnecting", {
						attempt: status.attempt,
						max: status.maxAttempts,
						time: secondsUntil(status.nextRetryAtMs, now)
					})
				};
				case "waiting-credentials": return {
					tone: "warning",
					label: t("status.waitingCredentials"),
					detail: t("detail.waitingCredentials", { error: status.lastError })
				};
				case "waiting-authorization": return {
					tone: "warning",
					label: t("status.waitingAuthorization"),
					detail: t("detail.waitingAuthorization", { reason: authorizationReason(status.reason, t) })
				};
				case "failed": {
					if ("reason" in status && status.reason === "cleanup") return {
						tone: "error",
						label: t("status.cleanup"),
						detail: t("detail.cleanup")
					};
					if ("reason" in status && status.reason === "load") return {
						tone: "error",
						label: t("status.failed"),
						detail: t("reason.load", { error: status.lastError })
					};
					const reason = "reason" in status ? status.reason : "gave-up";
					const detail = reason === "gave-up" ? t("reason.gaveUp") : reason === "reconnect-disabled" ? t("reason.reconnectDisabled") : t("reason.unclosed");
					const lastError = "lastError" in status ? status.lastError : void 0;
					return {
						tone: "error",
						label: t("status.failed"),
						detail: lastError === void 0 ? detail : `${detail} · ${lastError}`
					};
				}
				case "disabled": return {
					tone: "idle",
					label: t("status.disabled")
				};
				case "closed": return {
					tone: "idle",
					label: t("status.closed")
				};
				default: return {
					tone: "idle",
					label: t("status.unknown")
				};
			}
		}
		function countStatuses(views) {
			let connected = 0;
			let busy = 0;
			let attention = 0;
			let disabled = 0;
			for (const view of views) {
				const state = view?.status.state;
				if (state === "connected") connected += 1;
				else if (state === "connecting" || state === "reconnecting") busy += 1;
				else if (state === "waiting-credentials" || state === "waiting-authorization" || state === "failed") attention += 1;
				else if (state === "disabled") disabled += 1;
			}
			return {
				total: views.length,
				connected,
				busy,
				attention,
				disabled
			};
		}
		function authorizationReason(reason, t) {
			switch (reason) {
				case "missing": return t("authReason.missing");
				case "expired": return t("authReason.expired");
				case "binding": return t("authReason.binding");
				case "rejected": return t("authReason.rejected");
				case "scope": return t("authReason.scope");
				default: return reason;
			}
		}
		function clock(epochMs) {
			try {
				return new Date(epochMs).toLocaleTimeString(void 0, {
					hour: "2-digit",
					minute: "2-digit"
				});
			} catch {
				return String(epochMs);
			}
		}
		function secondsUntil(epochMs, now) {
			const seconds = Math.max(0, Math.ceil((epochMs - now) / 1e3));
			return `${String(seconds)} s`;
		}
		//#endregion
		//#region lib/types/client/panel-css.js
		/**
		* The page stylesheet, injected once by the section.
		*
		* The product ships no CSS-module loader for third-party client plugins, so the
		* rules live in one scoped string. Every selector is prefixed with
		* `.dsh-mcp` and every color is an official `--dsw-*` token with a light-theme
		* fallback; dark mode comes from the host's `data-ds-dark-theme` attribute.
		*/
		const COLORS = {
			text: "var(--dsw-alias-label-primary, #1b1e23)",
			secondary: "var(--dsw-alias-label-secondary, #5d6470)",
			tertiary: "var(--dsw-alias-label-tertiary, #8a919c)",
			border: "var(--dsw-alias-border-l2, #e1e4ea)",
			borderSubtle: "var(--dsw-alias-border-l1, #eceef2)",
			borderControl: "var(--dsw-alias-border-l4, #dcdfe5)",
			surface: "var(--dsw-alias-bg-layer-2, #ffffff)",
			surfaceSubtle: "var(--dsw-alias-bg-layer-1, #fafbfc)",
			surfaceRaised: "var(--dsw-alias-bg-layer-3, #f4f5f7)",
			business: "var(--dsw-alias-state-business-primary, #2f6fed)",
			businessSoft: "var(--dsw-alias-state-business-tertiary, #eaf1ff)",
			warn: "var(--dsw-alias-state-warn-primary, #b7791f)",
			warnSoft: "var(--dsw-alias-state-warn-tertiary, #fff6e5)",
			danger: "var(--dsw-alias-state-error-primary, #c93c37)",
			dangerSoft: "var(--dsw-alias-state-error-tertiary, #fdeeee)",
			success: "var(--dsw-alias-state-success-primary, #1c7c4a)",
			successSoft: "var(--dsw-alias-state-success-tertiary, #e9f8ef)",
			shadow: "var(--dsw-alias-drop-shadow-1, 0 8px 24px rgba(16, 24, 40, 0.10))"
		};
		const RADIUS = "var(--dsw-radius-md, 8px)";
		const RADIUS_SM = "var(--dsw-radius-sm, 6px)";
		const MONO = "var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)";
		const PANEL_CSS = `
.dsh-mcp {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: ${COLORS.text};
  font-size: 13px;
  line-height: 1.55;
}
.dsh-mcp * { box-sizing: border-box; }
/* The dialog portals to document.body, so the panel scope above never reaches it: restore the same
   base type scale and box model on the dialog root, and cap its height the way the host contracts ask. */
.dsh-mcp-dialog {
  width: min(560px, 100%);
  max-height: 100%;
  color: ${COLORS.text};
  font-size: 13px;
  line-height: 1.55;
}
.dsh-mcp-dialog * { box-sizing: border-box; }
.dsh-mcp-dialog-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.dsh-mcp-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.dsh-mcp-hero h2 { margin: 0 0 4px; font-size: 18px; font-weight: 600; line-height: 1.3; }
.dsh-mcp-hero p { margin: 0; color: ${COLORS.secondary}; max-width: 62ch; }
.dsh-mcp-hero-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-mcp-banner {
  display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: ${RADIUS};
  border: 1px solid ${COLORS.border}; background: ${COLORS.surfaceRaised}; color: ${COLORS.secondary};
}
.dsh-mcp-banner[data-tone="error"] { border-color: ${COLORS.danger}; background: ${COLORS.dangerSoft}; color: ${COLORS.danger}; }
.dsh-mcp-banner[data-tone="warning"] { border-color: ${COLORS.warn}; background: ${COLORS.warnSoft}; color: ${COLORS.warn}; }
.dsh-mcp-banner[data-tone="success"] { border-color: ${COLORS.success}; background: ${COLORS.successSoft}; color: ${COLORS.success}; }
.dsh-mcp-banner-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.dsh-mcp-banner-close { flex: none; }
.dsh-mcp-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.dsh-mcp-search { flex: 1 1 240px; min-width: 180px; }
.dsh-mcp-search input { width: 100%; }
.dsh-mcp-project { display: inline-flex; align-items: center; gap: 6px; color: ${COLORS.secondary}; }
.dsh-mcp-project select {
  max-width: 280px; padding: 5px 8px; border-radius: ${RADIUS_SM}; border: 1px solid ${COLORS.border};
  background: ${COLORS.surface}; color: ${COLORS.text}; font: inherit;
}
.dsh-mcp-project select:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-alias-state-business-tertiary, #dbe7ff); }
.dsh-mcp-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; color: ${COLORS.secondary}; }
.dsh-mcp-summary-chip { display: inline-flex; align-items: center; gap: 6px; }
.dsh-mcp-summary-total { margin-left: auto; color: ${COLORS.tertiary}; }
.dsh-mcp-list { display: flex; flex-direction: column; gap: 10px; }
.dsh-mcp-card {
  display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}; background: ${COLORS.surface};
}
.dsh-mcp-card[data-disabled="true"] { background: ${COLORS.surfaceSubtle}; }
.dsh-mcp-card-head { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
.dsh-mcp-name { font-family: ${MONO}; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
.dsh-mcp-head-tags { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dsh-mcp-head-end { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.dsh-mcp-status { display: inline-flex; align-items: center; gap: 6px; color: ${COLORS.secondary}; white-space: nowrap; }
.dsh-mcp-status[data-tone="error"] { color: ${COLORS.danger}; }
.dsh-mcp-status[data-tone="warning"] { color: ${COLORS.warn}; }
.dsh-mcp-status[data-tone="done"] { color: ${COLORS.success}; }
.dsh-mcp-meta { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: baseline; color: ${COLORS.secondary}; }
.dsh-mcp-meta code, .dsh-mcp-code {
  font-family: ${MONO}; font-size: 12px; color: ${COLORS.text}; background: ${COLORS.surfaceRaised};
  padding: 1px 6px; border-radius: ${RADIUS_SM}; overflow-wrap: anywhere;
}
.dsh-mcp-detail { color: ${COLORS.secondary}; overflow-wrap: anywhere; }
.dsh-mcp-detail strong { color: ${COLORS.danger}; font-weight: 500; }
.dsh-mcp-inline-note { display: flex; align-items: flex-start; gap: 6px; color: ${COLORS.warn}; }
.dsh-mcp-inline-note[data-tone="error"] { color: ${COLORS.danger}; }
.dsh-mcp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.dsh-mcp-actions-end { margin-left: auto; display: inline-flex; gap: 6px; }
.dsh-mcp-tools { border-top: 1px dashed ${COLORS.border}; padding-top: 8px; }
.dsh-mcp-tools summary {
  display: flex; align-items: center; gap: 6px; cursor: pointer; color: ${COLORS.secondary}; list-style: none;
}
.dsh-mcp-tools summary::-webkit-details-marker { display: none; }
.dsh-mcp-tools summary::before {
  content: ''; width: 0; height: 0; border-left: 4px solid currentColor; border-top: 4px solid transparent;
  border-bottom: 4px solid transparent; transition: transform 120ms ease;
}
.dsh-mcp-tools[open] summary::before { transform: rotate(90deg); }
.dsh-mcp-tools-body { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.dsh-mcp-tools-search input { width: 100%; max-width: 320px; }
.dsh-mcp-tool-list { display: flex; flex-direction: column; gap: 2px; max-height: 320px; overflow: auto; }
.dsh-mcp-tool {
  display: flex; align-items: flex-start; gap: 12px; padding: 6px 8px; border-radius: ${RADIUS_SM};
}
.dsh-mcp-tool:hover { background: ${COLORS.surfaceSubtle}; }
.dsh-mcp-tool-main { flex: 1; min-width: 0; }
.dsh-mcp-tool-name { font-family: ${MONO}; font-size: 12px; overflow-wrap: anywhere; }
.dsh-mcp-tool-desc { color: ${COLORS.tertiary}; font-size: 12px; overflow-wrap: anywhere; }
.dsh-mcp-tool-toggle { flex: none; }
.dsh-mcp-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 16px; text-align: center;
  border: 1px dashed ${COLORS.border}; border-radius: ${RADIUS}; color: ${COLORS.secondary};
}
.dsh-mcp-empty strong { color: ${COLORS.text}; font-size: 14px; }
.dsh-mcp-sources { border: 1px solid ${COLORS.border}; border-radius: ${RADIUS}; background: ${COLORS.surfaceSubtle}; }
.dsh-mcp-sources summary { cursor: pointer; padding: 10px 14px; color: ${COLORS.secondary}; }
.dsh-mcp-sources-body { display: flex; flex-direction: column; gap: 8px; padding: 0 14px 14px; }
.dsh-mcp-source-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.dsh-mcp-source-row code { font-family: ${MONO}; font-size: 11px; overflow-wrap: anywhere; }
.dsh-mcp-note { color: ${COLORS.tertiary}; font-size: 12px; margin: 0; }
.dsh-mcp-editor { display: flex; flex-direction: column; gap: 14px; }
.dsh-mcp-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dsh-mcp-field > label, .dsh-mcp-field-label { color: ${COLORS.secondary}; font-size: 12px; }
/* Input primitives draw their own frame on the wrapper: never restyle the inner <input>. */
.dsh-mcp-input-invalid { border-color: ${COLORS.danger}; }
.dsh-mcp-target {
  width: 100%; height: 32px; padding: 0 12px; border-radius: ${RADIUS};
  border: 0.5px solid ${COLORS.borderControl}; background: ${COLORS.surfaceSubtle}; color: ${COLORS.text};
  font: inherit; font-size: 14px;
}
.dsh-mcp-target:focus-visible { outline: none; border-color: ${COLORS.business}; }
.dsh-mcp-field-hint { color: ${COLORS.tertiary}; font-size: 11px; overflow-wrap: anywhere; }
.dsh-mcp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.dsh-mcp-section-title { font-weight: 600; color: ${COLORS.text}; margin: 0; }
.dsh-mcp-rows { display: flex; flex-direction: column; gap: 8px; }
.dsh-mcp-row { display: flex; align-items: center; gap: 6px; }
.dsh-mcp-row-input { flex: 1 1 auto; min-width: 0; }
.dsh-mcp-row-key, .dsh-mcp-row-value { min-width: 0; width: 100%; }
/* Key/value rows: key + remove above the value + flag, so the dialog's ~330px column never wraps either. */
.dsh-mcp-map-row {
  display: grid; align-items: center; gap: 6px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-areas: 'key key remove' 'value flag remove';
}
.dsh-mcp-map-row > .dsh-mcp-row-key { grid-area: key; }
.dsh-mcp-map-row > .dsh-mcp-row-value { grid-area: value; }
.dsh-mcp-map-row > .dsh-mcp-row-flag { grid-area: flag; }
.dsh-mcp-map-row > .dsh-mcp-row-remove { grid-area: remove; }
.dsh-mcp-row-flag { display: inline-flex; align-items: center; gap: 4px; color: ${COLORS.secondary}; font-size: 12px; white-space: nowrap; }
.dsh-mcp-row-remove { flex: none; }
.dsh-mcp-tag-note { color: ${COLORS.tertiary}; font-size: 11px; }
.dsh-mcp-probe { display: flex; flex-direction: column; gap: 10px; }
.dsh-mcp-probe-list { display: flex; flex-direction: column; gap: 2px; max-height: 280px; overflow: auto; }
.dsh-mcp-probe-item { font-family: ${MONO}; font-size: 12px; padding: 3px 6px; border-radius: ${RADIUS_SM}; background: ${COLORS.surfaceSubtle}; }
.dsh-mcp-kv { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; font-size: 12px; }
.dsh-mcp-kv dt { color: ${COLORS.secondary}; }
.dsh-mcp-kv dd { margin: 0; overflow-wrap: anywhere; }
.dsh-mcp-oauth-link {
  display: inline-flex; align-items: center; gap: 6px; color: ${COLORS.business}; overflow-wrap: anywhere;
}
.dsh-mcp-loading { display: flex; align-items: center; gap: 8px; padding: 24px 0; color: ${COLORS.secondary}; }
.dsh-mcp-visually-hidden {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (max-width: 767px) {
  .dsh-mcp-hero { flex-direction: column; }
  .dsh-mcp-hero-actions { width: 100%; }
  .dsh-mcp-card { padding: 12px; }
  .dsh-mcp-head-end { margin-left: 0; width: 100%; }
  .dsh-mcp-summary-total { margin-left: 0; }
  .dsh-mcp-source-row { flex-direction: column; gap: 2px; }
}
`;
		/** Join truthy class names. */
		function cx(...names) {
			return names.filter((name) => typeof name === "string" && name !== "").join(" ");
		}
		/**
		* Copy text through the Clipboard API, falling back to a hidden textarea.
		* @param text - the text to copy.
		* @returns whether the copy succeeded.
		*/
		async function copyText(text) {
			try {
				if (typeof navigator !== "undefined" && navigator.clipboard !== void 0) {
					await navigator.clipboard.writeText(text);
					return true;
				}
			} catch {}
			if (typeof document === "undefined") return false;
			try {
				const area = document.createElement("textarea");
				area.value = text;
				area.setAttribute("readonly", "");
				area.style.position = "fixed";
				area.style.opacity = "0";
				document.body.appendChild(area);
				area.select();
				const copied = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
				area.remove();
				return copied;
			} catch {
				return false;
			}
		}
		//#endregion
		//#region lib/types/client/ServerCard.js
		/** One server row: identity, source, live status, actions, and the tool policy. */
		function ServerCard(props) {
			const { row, t, busy } = props;
			const [toolFilter, setToolFilter] = (0, react.useState)("");
			const status = (0, react.useMemo)(() => describeStatus(row.runtime, t), [row.runtime, t]);
			const tools = (0, react.useMemo)(() => {
				const needle = toolFilter.trim().toLocaleLowerCase();
				if (needle === "") return row.tools;
				return row.tools.filter((tool) => `${tool.name} ${tool.description}`.toLocaleLowerCase().includes(needle));
			}, [row.tools, toolFilter]);
			const sourceLabel = row.kind === "entry" ? t("scope.entry") : scopeLabel$1(row.scope, t);
			const canEdit = row.writable;
			const oauth = row.oauth !== void 0;
			const authorizationPending = row.runtime?.status.state === "waiting-authorization";
			const registrationNote = row.registration !== void 0 && row.registration.state !== "registered" && row.registration.state !== "disabled" ? registrationText(row, t) : void 0;
			return (0, react_jsx_runtime.jsxs)("article", {
				className: cx("dsh-mcp-card"),
				"data-disabled": !row.enabled,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: cx("dsh-mcp-card-head"),
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								className: cx("dsh-mcp-name"),
								children: row.name
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: cx("dsh-mcp-head-tags"),
								children: [
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: row.kind === "entry" ? "info" : "outline",
										children: sourceLabel
									}),
									row.compat ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: "neutral",
										children: t("sources.compat")
									}) : null,
									row.compat ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: "warning",
										children: t("card.readonly")
									}) : null,
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: "quiet",
										children: row.transport === "stdio" ? t("card.stdio") : t("card.http")
									}),
									oauth ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: "info",
										children: t("card.oauth")
									}) : null,
									row.toolLoading === "on-demand" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: "neutral",
										children: t("editor.onDemand")
									}) : null,
									row.disabledTools.length > 0 ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: "warning",
										children: t("card.disabledTools", { count: row.disabledTools.length })
									}) : null
								]
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: cx("dsh-mcp-head-end"),
								children: [(0, react_jsx_runtime.jsxs)("span", {
									className: cx("dsh-mcp-status"),
									"data-tone": status.tone,
									children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: status.tone,
										size: 8
									}), status.label]
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
									checked: row.enabled,
									disabled: busy || !canEdit,
									label: t(row.enabled ? "action.disable" : "action.enable"),
									title: canEdit ? void 0 : t("card.readonly"),
									onChange: (next) => {
										props.onToggle(row, next);
									}
								})]
							})
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: cx("dsh-mcp-meta"),
						children: [row.transport === "stdio" ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(0, react_jsx_runtime.jsx)("span", { children: t("card.command") }),
							(0, react_jsx_runtime.jsx)("code", { children: row.command === "" ? "—" : row.command }),
							row.args.length > 0 ? (0, react_jsx_runtime.jsx)("code", { children: row.args.join(" ") }) : null,
							row.cwd !== "" ? (0, react_jsx_runtime.jsxs)("span", {
								title: row.cwd,
								children: [
									t("card.cwd"),
									": ",
									(0, react_jsx_runtime.jsx)("code", { children: row.cwd })
								]
							}) : null
						] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", { children: t("card.url") }), (0, react_jsx_runtime.jsx)("code", { children: row.url === "" ? "—" : row.url })] }), row.kind === "file" && row.path !== void 0 ? (0, react_jsx_runtime.jsxs)("span", {
							title: row.path,
							children: [
								t("card.path"),
								": ",
								(0, react_jsx_runtime.jsx)("code", { children: row.path })
							]
						}) : null]
					}),
					status.detail !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-detail"),
						children: status.detail
					}) : null,
					registrationNote !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-inline-note"),
						"data-tone": row.registration?.state === "conflict" ? "error" : void 0,
						children: registrationNote
					}) : null,
					row.shadowed.length > 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-inline-note"),
						children: t("card.shadowed", { scopes: row.shadowed.map((scope) => scopeLabel$1(scope, t)).join(", ") })
					}) : null,
					row.conflict ? (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-inline-note"),
						"data-tone": "error",
						children: t("registration.conflict")
					}) : null,
					row.kind === "entry" ? (0, react_jsx_runtime.jsx)("p", {
						className: cx("dsh-mcp-note"),
						children: t("card.entryHint")
					}) : null,
					(0, react_jsx_runtime.jsxs)("div", {
						className: cx("dsh-mcp-actions"),
						children: [
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 }),
								disabled: busy,
								onClick: () => {
									props.onRestart(row);
								},
								children: t("action.restart")
							}),
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutlineRegular, { size: 14 }),
								disabled: busy,
								onClick: () => {
									props.onProbe(row);
								},
								children: t("action.probe")
							}),
							oauth && authorizationPending ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								disabled: busy,
								onClick: () => {
									props.onAuthorize(row);
								},
								children: t("action.authorize")
							}) : null,
							oauth && row.runtime?.status.state === "connected" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								disabled: busy,
								onClick: () => {
									props.onSignOut(row);
								},
								children: t("action.signOut")
							}) : null,
							(0, react_jsx_runtime.jsxs)("span", {
								className: cx("dsh-mcp-actions-end"),
								children: [
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutlineRegular, { size: 14 }),
										disabled: busy,
										onClick: () => {
											props.onCopy(row);
										},
										children: t("copyJson")
									}),
									canEdit ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 14 }),
										disabled: busy,
										onClick: () => {
											props.onEdit(row);
										},
										children: t("edit")
									}) : null,
									canEdit ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 }),
										disabled: busy,
										onClick: () => {
											props.onDelete(row);
										},
										children: t("delete")
									}) : null
								]
							})
						]
					}),
					row.tools.length > 0 ? (0, react_jsx_runtime.jsxs)("details", {
						className: cx("dsh-mcp-tools"),
						children: [(0, react_jsx_runtime.jsxs)("summary", { children: [
							t("card.tools"),
							" · ",
							t("card.toolCount", { count: row.tools.length })
						] }), (0, react_jsx_runtime.jsxs)("div", {
							className: cx("dsh-mcp-tools-body"),
							children: [
								row.toolLoading === "on-demand" ? (0, react_jsx_runtime.jsx)("p", {
									className: cx("dsh-mcp-note"),
									children: t("card.onDemand")
								}) : null,
								row.tools.length > 6 ? (0, react_jsx_runtime.jsx)("div", {
									className: cx("dsh-mcp-tools-search"),
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										type: "search",
										value: toolFilter,
										placeholder: t("tool.search"),
										"aria-label": t("tool.search"),
										onChange: (event) => {
											setToolFilter(event.target.value);
										}
									})
								}) : null,
								(0, react_jsx_runtime.jsx)("div", {
									className: cx("dsh-mcp-tool-list"),
									children: tools.map((tool) => (0, react_jsx_runtime.jsxs)("div", {
										className: cx("dsh-mcp-tool"),
										children: [(0, react_jsx_runtime.jsxs)("div", {
											className: cx("dsh-mcp-tool-main"),
											children: [(0, react_jsx_runtime.jsx)("div", {
												className: cx("dsh-mcp-tool-name"),
												children: tool.name
											}), tool.description !== "" ? (0, react_jsx_runtime.jsx)("div", {
												className: cx("dsh-mcp-tool-desc"),
												children: tool.description
											}) : null]
										}), (0, react_jsx_runtime.jsx)("div", {
											className: cx("dsh-mcp-tool-toggle"),
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
												checked: tool.enabled,
												disabled: busy,
												label: t(tool.enabled ? "tool.disable" : "tool.enable"),
												onChange: (next) => {
													props.onToolToggle(row, tool.name, next);
												}
											})
										})]
									}, tool.name))
								})
							]
						})]
					}) : (0, react_jsx_runtime.jsxs)("details", {
						className: cx("dsh-mcp-tools"),
						children: [(0, react_jsx_runtime.jsx)("summary", { children: t("card.tools") }), (0, react_jsx_runtime.jsxs)("div", {
							className: cx("dsh-mcp-tools-body"),
							children: [(0, react_jsx_runtime.jsx)("p", {
								className: cx("dsh-mcp-note"),
								children: t("card.noTools")
							}), row.toolLoading === "on-demand" ? (0, react_jsx_runtime.jsx)("p", {
								className: cx("dsh-mcp-note"),
								children: t("card.onDemand")
							}) : null]
						})]
					})
				]
			});
		}
		function scopeLabel$1(scope, t) {
			switch (scope) {
				case "project": return t("scope.project");
				case "profile": return t("scope.profile");
				case "user": return t("scope.user");
				default: return t("scope.entry");
			}
		}
		function registrationText(row, t) {
			const registration = row.registration;
			if (registration === void 0) return void 0;
			switch (registration.state) {
				case "missing-env": return t("registration.missingEnv", { names: (registration.missing ?? []).join(", ") });
				case "invalid": return t("registration.invalid", { error: registration.error ?? "" });
				case "conflict": return t("registration.conflict");
				case "error": return t("registration.error", { error: registration.error ?? "" });
				default: return;
			}
		}
		//#endregion
		//#region lib/types/client/ServerEditor.js
		/** The create/edit dialog for one MCP server, whichever store it lives in. */
		function ServerEditor(props) {
			const { t, row } = props;
			const [draft, setDraft] = (0, react.useState)(props.draft);
			const [issues, setIssues] = (0, react.useState)([]);
			const editing = row !== void 0;
			const isFile = draft.target !== "entry";
			const patch = (fields) => {
				setDraft((current) => ({
					...current,
					...fields
				}));
			};
			const targetOptions = (0, react.useMemo)(() => [
				{
					value: "entry",
					label: t("editor.targetEntry"),
					disabled: !props.entryWritable,
					title: props.entryWritable ? void 0 : t("editor.noEntryWrite")
				},
				{
					value: "project",
					label: t("editor.targetProject"),
					disabled: !props.hasWorkspace || !props.hasProjectSelection,
					title: props.hasWorkspace ? void 0 : t("editor.noWorkspace")
				},
				{
					value: "profile",
					label: t("editor.targetProfile")
				},
				{
					value: "user",
					label: t("editor.targetUser")
				}
			], [
				props.entryWritable,
				props.hasWorkspace,
				props.hasProjectSelection,
				t
			]);
			const submit = () => {
				const found = validateDraft(draft);
				setIssues(found);
				if (found.length > 0) return;
				props.onSave(draft);
			};
			const bannerRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const banner = bannerRef.current;
				if (issues.length === 0 || banner === null || typeof banner.scrollIntoView !== "function") return;
				banner.scrollIntoView({ block: "nearest" });
			}, [issues]);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: props.onClose,
				closeLabel: t("close"),
				title: row === void 0 ? t("editor.new") : t("editor.edit", { name: row.name }),
				className: cx("dsh-mcp-dialog"),
				contentClassName: cx("dsh-mcp-dialog-body"),
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: props.onClose,
					disabled: props.busy,
					children: t("cancel")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					onClick: submit,
					disabled: props.busy,
					children: props.busy ? t("saving") : t("save")
				})] }),
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: cx("dsh-mcp-editor"),
					children: [
						(0, react_jsx_runtime.jsxs)("label", {
							className: cx("dsh-mcp-field"),
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-label"),
									children: t("editor.target")
								}),
								(0, react_jsx_runtime.jsx)("select", {
									className: cx("dsh-mcp-target"),
									value: draft.target,
									disabled: props.busy || editing && draft.target === "entry" && !props.entryWritable,
									onChange: (event) => {
										patch({ target: event.target.value });
									},
									children: targetOptions.map((option) => (0, react_jsx_runtime.jsx)("option", {
										value: option.value,
										disabled: option.disabled,
										title: option.title,
										children: option.label
									}, option.value))
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-hint"),
									children: draft.target === "entry" ? t("editor.targetHintEntry") : t("editor.targetHintFile")
								}),
								!props.hasWorkspace ? (0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-hint"),
									children: t("editor.noWorkspace")
								}) : !props.hasProjectSelection ? (0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-hint"),
									children: t("editor.noProject")
								}) : null,
								!props.entryWritable ? (0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-hint"),
									children: t("editor.noEntryWrite")
								}) : null
							]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: cx("dsh-mcp-grid"),
							children: [(0, react_jsx_runtime.jsxs)("label", {
								className: cx("dsh-mcp-field"),
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: cx("dsh-mcp-field-label"),
										children: t("editor.name")
									}),
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										className: cx(issues.includes("name") && "dsh-mcp-input-invalid"),
										value: draft.name,
										placeholder: "codebase-memory",
										spellCheck: false,
										disabled: props.busy,
										"aria-invalid": issues.includes("name"),
										onChange: (event) => {
											patch({ name: event.target.value });
										}
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: cx("dsh-mcp-field-hint"),
										children: t("editor.nameHint")
									})
								]
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: cx("dsh-mcp-field"),
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-label"),
									children: t("editor.transport")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
									id: "dsh-mcp-transport",
									label: t("editor.transport"),
									value: draft.transport,
									options: [{
										value: "stdio",
										label: t("card.stdio")
									}, {
										value: "streamable-http",
										label: t("card.http")
									}],
									onChange: (transport) => {
										patch({ transport });
									},
									disabled: props.busy
								})]
							})]
						}),
						draft.transport === "stdio" ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(0, react_jsx_runtime.jsxs)("label", {
								className: cx("dsh-mcp-field"),
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-label"),
									children: t("editor.command")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									className: cx(issues.includes("command") && "dsh-mcp-input-invalid"),
									value: draft.command,
									placeholder: "npx",
									spellCheck: false,
									disabled: props.busy,
									"aria-invalid": issues.includes("command"),
									onChange: (event) => {
										patch({ command: event.target.value });
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: cx("dsh-mcp-field"),
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: cx("dsh-mcp-field-label"),
										children: t("editor.args")
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: cx("dsh-mcp-rows"),
										children: draft.args.map((arg, index) => (0, react_jsx_runtime.jsxs)("div", {
											className: cx("dsh-mcp-row"),
											children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												className: cx("dsh-mcp-row-input"),
												value: arg,
												spellCheck: false,
												disabled: props.busy,
												"aria-label": `${t("editor.args")} ${String(index + 1)}`,
												onChange: (event) => {
													const args = [...draft.args];
													args[index] = event.target.value;
													patch({ args });
												}
											}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												className: cx("dsh-mcp-row-remove"),
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 13 }),
												"aria-label": t("editor.removeArg"),
												disabled: props.busy,
												onClick: () => {
													patch({ args: draft.args.filter((_, position) => position !== index) });
												}
											})]
										}, index))
									}),
									(0, react_jsx_runtime.jsx)("div", { children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }),
										disabled: props.busy,
										onClick: () => {
											patch({ args: [...draft.args, ""] });
										},
										children: t("editor.addArg")
									}) })
								]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: cx("dsh-mcp-field"),
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-label"),
									children: t("editor.cwd")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									value: draft.cwd,
									placeholder: "/home/user/project",
									spellCheck: false,
									disabled: props.busy,
									onChange: (event) => {
										patch({ cwd: event.target.value });
									}
								})]
							}),
							(0, react_jsx_runtime.jsx)(MapRows, {
								label: t("editor.env"),
								rows: draft.env,
								busy: props.busy,
								fileTarget: isFile,
								t,
								onChange: (env) => {
									patch({ env });
								}
							})
						] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(0, react_jsx_runtime.jsxs)("label", {
								className: cx("dsh-mcp-field"),
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-label"),
									children: t("editor.url")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									className: cx(issues.includes("url") && "dsh-mcp-input-invalid"),
									value: draft.url,
									placeholder: "https://mcp.example.com/mcp",
									spellCheck: false,
									disabled: props.busy,
									"aria-invalid": issues.includes("url"),
									onChange: (event) => {
										patch({ url: event.target.value });
									}
								})]
							}),
							(0, react_jsx_runtime.jsx)(MapRows, {
								label: t("editor.headers"),
								rows: draft.headers,
								busy: props.busy,
								fileTarget: isFile,
								t,
								onChange: (headers) => {
									patch({ headers });
								}
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: cx("dsh-mcp-field"),
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
									checked: draft.oauthEnabled,
									label: t("editor.oauth"),
									disabled: props.busy,
									onChange: (oauthEnabled) => {
										patch({ oauthEnabled });
									}
								}), (0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-field-hint"),
									children: t("editor.oauthHint")
								})]
							}),
							draft.oauthEnabled ? (0, react_jsx_runtime.jsxs)("div", {
								className: cx("dsh-mcp-grid"),
								children: [
									(0, react_jsx_runtime.jsxs)("label", {
										className: cx("dsh-mcp-field"),
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: cx("dsh-mcp-field-label"),
											children: t("editor.credentialKey")
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: cx(issues.includes("oauthKey") && "dsh-mcp-input-invalid"),
											value: draft.oauthCredentialKey,
											placeholder: "mcp-client/example",
											spellCheck: false,
											disabled: props.busy,
											"aria-invalid": issues.includes("oauthKey"),
											onChange: (event) => {
												patch({ oauthCredentialKey: event.target.value });
											}
										})]
									}),
									(0, react_jsx_runtime.jsxs)("label", {
										className: cx("dsh-mcp-field"),
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: cx("dsh-mcp-field-label"),
											children: t("editor.clientId")
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											value: draft.oauthClientId,
											spellCheck: false,
											disabled: props.busy,
											onChange: (event) => {
												patch({ oauthClientId: event.target.value });
											}
										})]
									}),
									(0, react_jsx_runtime.jsxs)("label", {
										className: cx("dsh-mcp-field"),
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: cx("dsh-mcp-field-label"),
											children: t("editor.scope")
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											value: draft.oauthScope,
											spellCheck: false,
											disabled: props.busy,
											onChange: (event) => {
												patch({ oauthScope: event.target.value });
											}
										})]
									}),
									(0, react_jsx_runtime.jsxs)("label", {
										className: cx("dsh-mcp-field"),
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: cx("dsh-mcp-field-label"),
											children: t("editor.requestTimeout")
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											value: draft.oauthRequestTimeout,
											inputMode: "numeric",
											disabled: props.busy,
											onChange: (event) => {
												patch({ oauthRequestTimeout: event.target.value });
											}
										})]
									}),
									(0, react_jsx_runtime.jsxs)("label", {
										className: cx("dsh-mcp-field"),
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: cx("dsh-mcp-field-label"),
											children: t("editor.authorizationTimeout")
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											value: draft.oauthAuthorizationTimeout,
											inputMode: "numeric",
											disabled: props.busy,
											onChange: (event) => {
												patch({ oauthAuthorizationTimeout: event.target.value });
											}
										})]
									})
								]
							}) : null
						] }),
						(0, react_jsx_runtime.jsxs)("details", {
							className: cx("dsh-mcp-tools"),
							children: [(0, react_jsx_runtime.jsx)("summary", { children: t("editor.advanced") }), (0, react_jsx_runtime.jsxs)("div", {
								className: cx("dsh-mcp-tools-body"),
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: cx("dsh-mcp-grid"),
										children: [
											(0, react_jsx_runtime.jsxs)("label", {
												className: cx("dsh-mcp-field"),
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: cx("dsh-mcp-field-label"),
													children: t("editor.startupTimeout")
												}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
													value: draft.startupTimeoutMs,
													inputMode: "numeric",
													disabled: props.busy,
													onChange: (event) => {
														patch({ startupTimeoutMs: event.target.value });
													}
												})]
											}),
											(0, react_jsx_runtime.jsxs)("label", {
												className: cx("dsh-mcp-field"),
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: cx("dsh-mcp-field-label"),
													children: t("editor.closeTimeout")
												}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
													value: draft.closeTimeoutMs,
													inputMode: "numeric",
													disabled: props.busy,
													onChange: (event) => {
														patch({ closeTimeoutMs: event.target.value });
													}
												})]
											}),
											(0, react_jsx_runtime.jsxs)("label", {
												className: cx("dsh-mcp-field"),
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: cx("dsh-mcp-field-label"),
													children: t("editor.toolCallTimeout")
												}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
													value: draft.toolCallTimeoutMs,
													inputMode: "numeric",
													disabled: props.busy,
													onChange: (event) => {
														patch({ toolCallTimeoutMs: event.target.value });
													}
												})]
											}),
											(0, react_jsx_runtime.jsxs)("div", {
												className: cx("dsh-mcp-field"),
												children: [
													(0, react_jsx_runtime.jsx)("span", {
														className: cx("dsh-mcp-field-label"),
														children: t("editor.toolLoading")
													}),
													(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
														id: "dsh-mcp-tool-loading",
														label: t("editor.toolLoading"),
														value: draft.toolLoading,
														options: [{
															value: "eager",
															label: t("editor.eager")
														}, {
															value: "on-demand",
															label: t("editor.onDemand")
														}],
														onChange: (toolLoading) => {
															patch({ toolLoading });
														},
														disabled: props.busy
													}),
													draft.toolLoading === "on-demand" ? (0, react_jsx_runtime.jsx)("span", {
														className: cx("dsh-mcp-field-hint"),
														children: t("editor.onDemandHint")
													}) : null
												]
											})
										]
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: cx("dsh-mcp-field"),
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
											checked: draft.reconnectEnabled,
											label: t("editor.reconnectEnabled"),
											disabled: props.busy,
											onChange: (reconnectEnabled) => {
												patch({ reconnectEnabled });
											}
										})
									}),
									draft.reconnectEnabled ? (0, react_jsx_runtime.jsxs)("div", {
										className: cx("dsh-mcp-grid"),
										children: [
											(0, react_jsx_runtime.jsxs)("label", {
												className: cx("dsh-mcp-field"),
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: cx("dsh-mcp-field-label"),
													children: t("editor.initialDelay")
												}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
													value: draft.reconnectInitial,
													inputMode: "numeric",
													disabled: props.busy,
													onChange: (event) => {
														patch({ reconnectInitial: event.target.value });
													}
												})]
											}),
											(0, react_jsx_runtime.jsxs)("label", {
												className: cx("dsh-mcp-field"),
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: cx("dsh-mcp-field-label"),
													children: t("editor.maxDelay")
												}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
													value: draft.reconnectMax,
													inputMode: "numeric",
													disabled: props.busy,
													onChange: (event) => {
														patch({ reconnectMax: event.target.value });
													}
												})]
											}),
											(0, react_jsx_runtime.jsxs)("label", {
												className: cx("dsh-mcp-field"),
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: cx("dsh-mcp-field-label"),
													children: t("editor.maxAttempts")
												}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
													value: draft.reconnectAttempts,
													inputMode: "numeric",
													disabled: props.busy,
													onChange: (event) => {
														patch({ reconnectAttempts: event.target.value });
													}
												})]
											})
										]
									}) : null
								]
							})]
						}),
						issues.length > 0 ? (0, react_jsx_runtime.jsx)("div", {
							ref: bannerRef,
							className: cx("dsh-mcp-banner"),
							"data-tone": "error",
							role: "alert",
							children: (0, react_jsx_runtime.jsx)("span", {
								className: cx("dsh-mcp-banner-text"),
								children: issues.map((issue) => t(issueKey(issue))).join(" · ")
							})
						}) : null
					]
				})
			});
		}
		function MapRows(props) {
			const { t } = props;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: cx("dsh-mcp-field"),
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: cx("dsh-mcp-field-label"),
						children: props.label
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-rows"),
						children: props.rows.map((row, index) => (0, react_jsx_runtime.jsxs)("div", {
							className: cx("dsh-mcp-map-row"),
							children: [
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									className: cx("dsh-mcp-row-key"),
									value: row.key,
									placeholder: t("editor.keyPlaceholder"),
									spellCheck: false,
									title: row.key,
									disabled: props.busy,
									"aria-label": `${props.label} ${t("editor.keyPlaceholder")} ${String(index + 1)}`,
									onChange: (event) => {
										const rows = props.rows.map((entry, position) => position === index ? {
											...entry,
											key: event.target.value
										} : entry);
										props.onChange(rows);
									}
								}),
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									className: cx("dsh-mcp-row-value"),
									value: row.value,
									placeholder: row.configured ? t("editor.secretKept") : t("editor.valuePlaceholder"),
									spellCheck: false,
									disabled: props.busy,
									"aria-label": `${props.label} ${t("editor.valuePlaceholder")} ${String(index + 1)}`,
									onChange: (event) => {
										const rows = props.rows.map((entry, position) => position === index ? {
											...entry,
											value: event.target.value
										} : entry);
										props.onChange(rows);
									}
								}),
								props.fileTarget ? (0, react_jsx_runtime.jsx)("span", {
									className: cx("dsh-mcp-row-flag"),
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
										checked: row.secret,
										label: t("editor.secret"),
										disabled: props.busy,
										onChange: (secret) => {
											const rows = props.rows.map((entry, position) => position === index ? {
												...entry,
												secret
											} : entry);
											props.onChange(rows);
										}
									})
								}) : null,
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									className: cx("dsh-mcp-row-remove"),
									icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 13 }),
									"aria-label": t("editor.removeRow"),
									disabled: props.busy,
									onClick: () => {
										props.onChange(props.rows.filter((_, position) => position !== index));
									}
								})
							]
						}, index))
					}),
					props.fileTarget && props.rows.some((row) => row.configured) ? (0, react_jsx_runtime.jsx)("span", {
						className: cx("dsh-mcp-field-hint"),
						children: t("editor.secretHint")
					}) : null,
					(0, react_jsx_runtime.jsx)("div", { children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "sm",
						icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }),
						disabled: props.busy,
						onClick: () => {
							props.onChange([...props.rows, {
								key: "",
								value: "",
								secret: false,
								configured: false
							}]);
						},
						children: t("editor.addRow")
					}) })
				]
			});
		}
		//#endregion
		//#region lib/types/client/ProbeDialog.js
		/** The probe dialog: one throwaway connection that reports what the server advertises. */
		function ProbeDialog(props) {
			const { t, name } = props;
			const [state, setState] = (0, react.useState)({ phase: "running" });
			const runId = (0, react.useRef)(0);
			const run = () => {
				const current = ++runId.current;
				setState({ phase: "running" });
				props.run(name).then((outcome) => {
					if (runId.current !== current) return;
					setState(outcome.ok ? {
						phase: "result",
						result: outcome.result
					} : {
						phase: "rpc-failure",
						message: outcome.message
					});
				}, (error) => {
					if (runId.current !== current) return;
					setState({
						phase: "rpc-failure",
						message: error instanceof Error ? error.message : String(error)
					});
				});
			};
			(0, react.useEffect)(() => {
				run();
				return () => {
					runId.current += 1;
				};
			}, [name]);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: props.onClose,
				title: t("probe.title", { name }),
				closeLabel: t("close"),
				footer: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					onClick: props.onClose,
					children: t("probe.done")
				}),
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: cx("dsh-mcp-probe"),
					children: [
						state.phase === "running" ? (0, react_jsx_runtime.jsx)("p", { children: t("probe.running") }) : null,
						state.phase === "result" && state.result.ok ? (0, react_jsx_runtime.jsx)(ProbeSuccess, {
							result: state.result,
							t
						}) : null,
						state.phase === "result" && !state.result.ok ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: cx("dsh-mcp-status"),
								"data-tone": "error",
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: "error",
									size: 8
								}), t("probe.failure")]
							}),
							(0, react_jsx_runtime.jsxs)("dl", {
								className: cx("dsh-mcp-kv"),
								children: [
									(0, react_jsx_runtime.jsx)("dt", { children: t("probe.stage") }),
									(0, react_jsx_runtime.jsx)("dd", { children: state.result.stage === "connect" ? t("probe.stageConnect") : t("probe.stageList") }),
									(0, react_jsx_runtime.jsx)("dt", { children: t("probe.duration") }),
									(0, react_jsx_runtime.jsxs)("dd", { children: [state.result.durationMs, " ms"] })
								]
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: cx("dsh-mcp-detail"),
								children: state.result.message
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: cx("dsh-mcp-note"),
								children: state.result.closeConfirmed ? t("probe.closeConfirmed") : t("probe.cleanupError", { error: state.result.cleanupError ?? "" })
							})
						] }) : null,
						state.phase === "rpc-failure" ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("div", {
							className: cx("dsh-mcp-status"),
							"data-tone": "error",
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: "error",
								size: 8
							}), t("probe.failure")]
						}), (0, react_jsx_runtime.jsx)("p", {
							className: cx("dsh-mcp-detail"),
							children: state.message
						})] }) : null,
						(0, react_jsx_runtime.jsx)("div", { children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							onClick: run,
							children: t("probe.again")
						}) })
					]
				})
			});
		}
		function ProbeSuccess(props) {
			const { result, t } = props;
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsxs)("div", {
					className: cx("dsh-mcp-status"),
					"data-tone": "done",
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
						state: "done",
						size: 8
					}), t("probe.success")]
				}),
				(0, react_jsx_runtime.jsxs)("dl", {
					className: cx("dsh-mcp-kv"),
					children: [
						result.serverInfo !== void 0 ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("probe.server") }), (0, react_jsx_runtime.jsxs)("dd", { children: [
							result.serverInfo.name,
							" ",
							result.serverInfo.version
						] })] }) : null,
						(0, react_jsx_runtime.jsx)("dt", { children: t("probe.duration") }),
						(0, react_jsx_runtime.jsxs)("dd", { children: [result.durationMs, " ms"] }),
						(0, react_jsx_runtime.jsx)("dt", { children: t("probe.tools") }),
						(0, react_jsx_runtime.jsx)("dd", { children: result.toolNames.length === 0 ? t("probe.empty") : String(result.toolNames.length) })
					]
				}),
				result.truncated ? (0, react_jsx_runtime.jsx)("p", {
					className: cx("dsh-mcp-note"),
					children: t("probe.truncated")
				}) : null,
				(0, react_jsx_runtime.jsx)("div", {
					className: cx("dsh-mcp-probe-list"),
					children: result.toolNames.map((tool) => (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-probe-item"),
						children: tool
					}, tool))
				}),
				(0, react_jsx_runtime.jsx)("p", {
					className: cx("dsh-mcp-note"),
					children: result.closeConfirmed ? t("probe.closeConfirmed") : result.cleanupError === void 0 ? null : t("probe.cleanupError", { error: result.cleanupError })
				})
			] });
		}
		//#endregion
		//#region lib/types/client/OAuthDialog.js
		/** The OAuth dialog: the Host starts the attempt; the browser only opens the page and cancels. */
		const PHASE_KEYS = {
			starting: "oauth.starting",
			"waiting-browser": "oauth.waitingBrowser",
			exchanging: "oauth.exchanging",
			committing: "oauth.committing",
			authorized: "oauth.authorized",
			cancelled: "oauth.cancelled",
			failed: "oauth.failed"
		};
		function OAuthDialog(props) {
			const { t, name } = props;
			const [attempt, setAttempt] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			const [busy, setBusy] = (0, react.useState)(false);
			const live = (0, react.useRef)(true);
			const start = () => {
				setBusy(true);
				setError(void 0);
				props.start().then((result) => {
					if (!live.current) return;
					setAttempt(result);
					if (result === void 0) setError(t("oauth.startFailed", { message: "" }));
				}).finally(() => {
					if (live.current) setBusy(false);
				});
			};
			(0, react.useEffect)(() => {
				live.current = true;
				start();
				return () => {
					live.current = false;
				};
			}, []);
			const cancel = () => {
				if (attempt === void 0) return;
				setBusy(true);
				props.cancel(attempt.id).then((accepted) => {
					if (live.current && accepted) setAttempt({
						...attempt,
						phase: "cancelled"
					});
				}).finally(() => {
					if (live.current) setBusy(false);
				});
			};
			const final = attempt !== void 0 && (attempt.phase === "authorized" || attempt.phase === "cancelled" || attempt.phase === "failed");
			const waiting = attempt?.phase === "waiting-browser";
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: props.onClose,
				title: t("oauth.title", { name }),
				closeLabel: t("close"),
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					props.connected ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: () => {
							props.signOut();
						},
						disabled: busy,
						children: t("oauth.signOut")
					}) : null,
					attempt !== void 0 && !final ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: cancel,
						disabled: busy,
						children: t("oauth.cancel")
					}) : null,
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						onClick: props.onClose,
						disabled: busy,
						children: t("oauth.done")
					})
				] }),
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: cx("dsh-mcp-probe"),
					children: [
						attempt !== void 0 ? (0, react_jsx_runtime.jsxs)("div", {
							className: cx("dsh-mcp-status"),
							"data-tone": attempt.phase === "authorized" ? "done" : attempt.phase === "failed" ? "error" : "ongoing",
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: attempt.phase === "authorized" ? "done" : attempt.phase === "failed" ? "error" : "ongoing",
								size: 8
							}), t(PHASE_KEYS[attempt.phase], { error: attempt.lastError ?? error ?? "" })]
						}) : (0, react_jsx_runtime.jsx)("p", { children: busy ? t("oauth.starting") : t("oauth.startFailed", { message: error ?? "" }) }),
						attempt?.lastError !== void 0 ? (0, react_jsx_runtime.jsx)("p", {
							className: cx("dsh-mcp-detail"),
							children: attempt.lastError
						}) : null,
						error !== void 0 && attempt === void 0 ? (0, react_jsx_runtime.jsx)("p", {
							className: cx("dsh-mcp-detail"),
							children: error
						}) : null,
						waiting && attempt?.authorizationUrl !== void 0 ? (0, react_jsx_runtime.jsxs)("a", {
							className: cx("dsh-mcp-oauth-link"),
							href: attempt.authorizationUrl,
							target: "_blank",
							rel: "noopener noreferrer",
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutlineRegular, { size: 14 }), t("oauth.open")]
						}) : null,
						!final ? (0, react_jsx_runtime.jsx)("p", {
							className: cx("dsh-mcp-note"),
							children: t("oauth.hint")
						}) : null,
						attempt === void 0 ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							onClick: start,
							disabled: busy,
							children: t("retry")
						}) : null
					]
				})
			});
		}
		//#endregion
		//#region lib/types/client/McpSection.js
		/** Settings → MCP: one page over the official entries and every file scope. */
		function McpSection(props) {
			const { t } = props;
			const store = props.store;
			const state = (0, react.useSyncExternalStore)(store.state.subscribe, store.state.getSnapshot);
			const [search, setSearch] = (0, react.useState)("");
			const [source, setSource] = (0, react.useState)("all");
			const [status, setStatus] = (0, react.useState)("all");
			const [editor, setEditor] = (0, react.useState)(void 0);
			const [probe, setProbe] = (0, react.useState)(void 0);
			const [oauth, setOauth] = (0, react.useState)(void 0);
			const [deleting, setDeleting] = (0, react.useState)(void 0);
			const [acknowledged, setAcknowledged] = (0, react.useState)(false);
			const entryServers = state.upstream.value?.servers ?? {};
			const disabledTools = state.own.value?.disabledTools ?? {};
			const entryWritable = state.upstream.status === "ready" && state.upstream.writable;
			const all = (0, react.useMemo)(() => buildSummaries(state.snapshot, state.managed, entryServers, disabledTools, entryWritable), [
				state.snapshot,
				state.managed,
				entryServers,
				disabledTools,
				entryWritable
			]);
			const rows = (0, react.useMemo)(() => filterSummaries(all, search, source, status), [
				all,
				search,
				source,
				status
			]);
			const counts = (0, react.useMemo)(() => countStatuses(all.map((row) => row.runtime)), [all]);
			const workspaces = state.snapshot?.workspaces ?? [];
			const sources = state.snapshot?.sources ?? [];
			const busy = state.busy;
			const oauthName = oauth;
			const oauthRow = oauthName === void 0 ? void 0 : all.find((row) => row.name === oauthName);
			const deleteOpen = deleting !== void 0;
			const beginDelete = (row) => {
				setAcknowledged(false);
				setDeleting(row);
			};
			const confirmDelete = () => {
				if (deleting === void 0) return;
				store.removeServer(deleting);
				setDeleting(void 0);
				setAcknowledged(false);
			};
			const saveEditor = (draft) => {
				const current = editor;
				if (current === void 0) return;
				const original = current.row;
				(draft.target === "entry" ? store.saveEntry(draft.name, entryFromDraft(draft)) : store.upsertServer({
					scope: scopeOf(draft.target),
					server: patchFromDraft(draft)
				})).then((accepted) => {
					if (!accepted) return;
					if (original !== void 0 && original.name !== draft.name) {
						if (original.kind === "entry") store.removeEntry(original.name);
						else store.removeServer(original);
					}
					setEditor(void 0);
				});
			};
			const openEditor = (row) => {
				const defaultTarget = entryWritable ? "entry" : "profile";
				setEditor({
					...row === void 0 ? {} : { row },
					draft: createDraft(row, defaultTarget)
				});
			};
			return (0, react_jsx_runtime.jsxs)("section", {
				className: cx("dsh-mcp"),
				"aria-labelledby": "dsh-mcp-title",
				children: [
					(0, react_jsx_runtime.jsx)("style", { children: PANEL_CSS }),
					(0, react_jsx_runtime.jsxs)("header", {
						className: cx("dsh-mcp-hero"),
						children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("h2", {
							id: "dsh-mcp-title",
							children: t("title")
						}), (0, react_jsx_runtime.jsx)("p", { children: t("subtitle") })] }), (0, react_jsx_runtime.jsxs)("div", {
							className: cx("dsh-mcp-hero-actions"),
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 }),
								disabled: busy,
								onClick: () => {
									store.refresh();
								},
								children: busy ? t("refreshing") : t("refresh")
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }),
								onClick: () => {
									openEditor(void 0);
								},
								children: t("add")
							})]
						})]
					}),
					state.streamFailed ? (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-banner"),
						"data-tone": "warning",
						role: "status",
						children: (0, react_jsx_runtime.jsx)("span", {
							className: cx("dsh-mcp-banner-text"),
							children: t("error.stream")
						})
					}) : null,
					state.pollFailed ? (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-banner"),
						"data-tone": "warning",
						role: "status",
						children: (0, react_jsx_runtime.jsx)("span", {
							className: cx("dsh-mcp-banner-text"),
							children: t("error.snapshot", { message: state.error ?? "" })
						})
					}) : null,
					state.upstream.status === "unavailable" ? (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-banner"),
						"data-tone": "warning",
						children: (0, react_jsx_runtime.jsx)("span", {
							className: cx("dsh-mcp-banner-text"),
							children: t("error.upstream")
						})
					}) : null,
					state.notice !== void 0 ? (0, react_jsx_runtime.jsxs)("div", {
						className: cx("dsh-mcp-banner"),
						"data-tone": state.notice.tone === "error" ? "error" : "success",
						role: state.notice.tone === "error" ? "alert" : "status",
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: cx("dsh-mcp-banner-text"),
							children: state.notice.text
						}), (0, react_jsx_runtime.jsx)("span", {
							className: cx("dsh-mcp-banner-close"),
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									store.clearNotice();
								},
								children: t("close")
							})
						})]
					}) : null,
					(0, react_jsx_runtime.jsxs)("div", {
						className: cx("dsh-mcp-toolbar"),
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								className: cx("dsh-mcp-search"),
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									type: "search",
									value: search,
									placeholder: t("filter.searchPlaceholder"),
									"aria-label": t("filter.search"),
									onChange: (event) => {
										setSearch(event.target.value);
									}
								})
							}),
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
								id: "dsh-mcp-source",
								label: t("filter.source"),
								value: source,
								options: [
									{
										value: "all",
										label: t("filter.all")
									},
									{
										value: "entry",
										label: t("source.entry")
									},
									{
										value: "file",
										label: t("source.file")
									}
								],
								onChange: (next) => {
									setSource(next);
								}
							}),
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
								id: "dsh-mcp-status",
								label: t("filter.status"),
								value: status,
								options: [
									{
										value: "all",
										label: t("filter.all")
									},
									{
										value: "connected",
										label: t("status.connected")
									},
									{
										value: "busy",
										label: t("status.connecting")
									},
									{
										value: "attention",
										label: t("filter.attention")
									},
									{
										value: "disabled",
										label: t("status.disabled")
									}
								],
								onChange: (next) => {
									setStatus(next);
								}
							}),
							workspaces.length > 0 ? (0, react_jsx_runtime.jsxs)("label", {
								className: cx("dsh-mcp-project"),
								children: [(0, react_jsx_runtime.jsx)("span", { children: t("scope.project") }), (0, react_jsx_runtime.jsxs)("select", {
									value: state.projectPath ?? "",
									disabled: busy,
									onChange: (event) => {
										store.selectProject(event.target.value === "" ? void 0 : event.target.value);
									},
									children: [(0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("none")
									}), workspaces.map((workspace) => (0, react_jsx_runtime.jsx)("option", {
										value: workspace.path,
										children: workspace.title ?? workspace.path
									}, workspace.path))]
								})]
							}) : null
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: cx("dsh-mcp-summary"),
						children: [
							(0, react_jsx_runtime.jsxs)("span", {
								className: cx("dsh-mcp-summary-chip"),
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: counts.connected > 0 ? "done" : "idle",
									size: 8
								}), t("summary.connected", { count: counts.connected })]
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: cx("dsh-mcp-summary-chip"),
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: counts.busy > 0 ? "ongoing" : "idle",
									size: 8
								}), t("summary.busy", { count: counts.busy })]
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: cx("dsh-mcp-summary-chip"),
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: counts.attention > 0 ? "warning" : "idle",
									size: 8
								}), t("summary.attention", { count: counts.attention })]
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: cx("dsh-mcp-summary-chip"),
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: "idle",
									size: 8
								}), t("summary.disabled", { count: counts.disabled })]
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: cx("dsh-mcp-summary-total"),
								children: t("count", { count: counts.total })
							})
						]
					}),
					state.status === "error" ? (0, react_jsx_runtime.jsxs)("div", {
						className: cx("dsh-mcp-empty"),
						children: [(0, react_jsx_runtime.jsx)("strong", { children: t("error.snapshot", { message: state.error ?? "" }) }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: () => {
								store.refresh();
							},
							children: t("retry")
						})]
					}) : null,
					state.status === "loading" ? (0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-loading"),
						children: t("loading.servers")
					}) : null,
					state.status === "ready" && rows.length === 0 ? (0, react_jsx_runtime.jsxs)("div", {
						className: cx("dsh-mcp-empty"),
						children: [
							(0, react_jsx_runtime.jsx)("strong", { children: t("empty.title") }),
							(0, react_jsx_runtime.jsx)("span", { children: all.length === 0 ? t("empty.description") : t("filter.search") }),
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }),
								onClick: () => {
									openEditor(void 0);
								},
								children: all.length === 0 ? t("empty.action") : t("add")
							})
						]
					}) : null,
					(0, react_jsx_runtime.jsx)("div", {
						className: cx("dsh-mcp-list"),
						children: rows.map((row) => (0, react_jsx_runtime.jsx)(ServerCard, {
							row,
							t,
							busy,
							onToggle: (target, enabled) => {
								store.setEnabled(target, enabled);
							},
							onEdit: (target) => {
								openEditor(target);
							},
							onDelete: beginDelete,
							onRestart: (target) => {
								store.restart(target.name);
							},
							onProbe: (target) => {
								setProbe(target.name);
							},
							onAuthorize: (target) => {
								setOauth(target.name);
							},
							onSignOut: (target) => {
								store.signOut(target.name);
							},
							onToolToggle: (target, tool, enabled) => {
								store.setToolEnabled(target.name, tool, enabled);
							},
							onCopy: (target) => {
								copyText(rowToJson(target)).then((copied) => {
									store.notify(t(copied ? "notice.copied" : "notice.copyFailed"), copied ? "success" : "error");
								});
							}
						}, `${row.kind}:${row.name}`))
					}),
					sources.length > 0 ? (0, react_jsx_runtime.jsxs)("details", {
						className: cx("dsh-mcp-sources"),
						children: [(0, react_jsx_runtime.jsx)("summary", { children: t("sources.title") }), (0, react_jsx_runtime.jsxs)("div", {
							className: cx("dsh-mcp-sources-body"),
							children: [(0, react_jsx_runtime.jsx)("p", {
								className: cx("dsh-mcp-note"),
								children: t("sources.hint")
							}), sources.map((file) => (0, react_jsx_runtime.jsxs)("div", {
								className: cx("dsh-mcp-source-row"),
								children: [
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: file.compat ? "warning" : "outline",
										children: scopeLabel(file.scope, t)
									}),
									(0, react_jsx_runtime.jsx)("code", { children: file.path }),
									(0, react_jsx_runtime.jsxs)("span", {
										className: cx("dsh-mcp-tag-note"),
										children: [
											file.exists ? file.writable ? t("sources.writable") : t("sources.readonly") : t("sources.missing"),
											" · ",
											t("sources.count", { count: file.serverCount })
										]
									})
								]
							}, `${file.scope}:${file.path}`))]
						})]
					}) : null,
					(0, react_jsx_runtime.jsx)("p", {
						className: cx("dsh-mcp-note"),
						children: t("panel.toolsNote")
					}),
					editor !== void 0 ? (0, react_jsx_runtime.jsx)(ServerEditor, {
						row: editor.row,
						draft: editor.draft,
						busy,
						entryWritable,
						hasWorkspace: workspaces.length > 0,
						hasProjectSelection: state.projectPath !== void 0,
						t,
						onClose: () => {
							setEditor(void 0);
						},
						onSave: saveEditor
					}, `${editor.row?.kind ?? "new"}:${editor.row?.name ?? "new"}`) : null,
					probe !== void 0 ? (0, react_jsx_runtime.jsx)(ProbeDialog, {
						name: probe,
						t,
						onClose: () => {
							setProbe(void 0);
						},
						run: (name) => store.probe(name)
					}, probe) : null,
					oauthName !== void 0 ? (0, react_jsx_runtime.jsx)(OAuthDialog, {
						name: oauthName,
						t,
						connected: oauthRow?.runtime?.status.state === "connected",
						onClose: () => {
							setOauth(void 0);
						},
						start: () => store.authorize(oauthName),
						cancel: (id) => store.cancelAuthorization(oauthName, id),
						signOut: () => store.signOut(oauthName)
					}, oauthName) : null,
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
						open: deleteOpen,
						title: t("confirm.deleteTitle"),
						description: deleting === void 0 ? "" : t("confirm.deleteDescription", { name: deleting.name }),
						acknowledgeLabel: t("confirm.acknowledge"),
						cancelLabel: t("confirm.cancel"),
						closeLabel: t("close"),
						confirmLabel: t("confirm.delete"),
						acknowledged,
						disabled: busy,
						onAcknowledgedChange: setAcknowledged,
						onCancel: () => {
							setDeleting(void 0);
						},
						onConfirm: confirmDelete
					})
				]
			});
		}
		function scopeLabel(scope, t) {
			switch (scope) {
				case "project": return t("scope.project");
				case "profile": return t("scope.profile");
				case "user": return t("scope.user");
			}
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Browser entry for Settings → MCP. */
		const NS = "settings.mcpManager";
		/**
		* `remote.mcpManager` carries the official live status stream, restart, and
		* probe. `configForms` carries the two official entry forms: the upstream
		* `mcp-manager` entry and this plugin's own entry. `connection` carries the
		* file-scope RPC and the Host-only OAuth operations.
		*/
		const inject = [
			"connection",
			"remote",
			"remote.mcpManager",
			"slots",
			"locale",
			"configForms"
		];
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-mcp-manager: dictionaries");
			const store = createManagerStore(ctx, createManagerApi(ctx), createUpstreamForm(ctx.configForms.get(MCP_UPSTREAM_NAMESPACE)), createOwnForm(ctx.configForms.get(MCP_MANAGER_NAMESPACE)), t);
			ctx.effect(() => () => store.dispose(), "dsh-mcp-manager: store");
			const injected = () => ({ store });
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "mcp",
				order: 20,
				label: () => t("title"),
				locale: NS,
				inject: injected
			}, McpSection));
		}
		//#endregion
		exports.McpSection = McpSection;
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map