# dsh-mcp-manager 0.5.0 升级方案（对齐 DSH 0.2.3-alpha.2 官方 MCP 体系）

- 目标运行时：DeepSeek Harness **0.2.3-alpha.2**（`~/.local/opt/deepseek-harness/resources/app/dsh`）
- 起点：`@junjiangao/dsh-web-mcp-manager@0.4.0`（目标运行时 0.2.1-alpha.1，自建 `dsh-mcp-client` 舰队）
- 命名：包名 `@junjiangao/dsh-mcp-manager`；社区身份 `junjiangao/dsh-mcp-manager`；Loader 行 id `dsh-mcp-manager`；显示名「MCP 管理器 / MCP manager」
- 验证方式（用户指定）：不安装进任何 profile，只做构建、单测、静态预览

---

## 1. 为什么要重构

0.2.3-alpha.2 已在 `dsh-web-app` 组合里内置 `@deepseek-ai/dsh-mcp-manager`（行 id `mcp-manager`，`inject: [credentials]`）。它已经承担本插件 0.4.0 自研的那套职责：

| 能力 | 0.4.0（自研） | 0.2.3 官方 |
|---|---|---|
| 受管服务器集合 | `McpManagerController.mount()` 挂 `dsh-mcp-client` | `ctx.mcpManager` 的 volatile `config.servers` + 插件 `register()` |
| 生命周期/重连/重建 | 自写 fingerprint + 重挂 | 管理器对账：新增挂载、变更重建、`enabled:false` 卸载 |
| 状态 | `pending/loading/loaded/failed` 五值 | `connecting/connected/reconnecting/waiting-credentials/waiting-authorization/closed/failed/disabled`（含 attempt、nextRetryAtMs、toolCount、authorization） |
| 重启 / 探测 | 自写 reload；无探测 | `restart`（Host + Remote）、`probe`（五阶段结果、`closeConfirmed`） |
| 配置编辑 | 自建 RPC 写 `mcp.json`；entry 走 `configForms` | `servers` 是 volatile 配置：浏览器经官方共享表单 `ctx.configForms.get('mcp-manager')` 用路径操作 + revision 栅栏写入 |
| OAuth | 不支持 | mcp-client 支持 `${credential:REF}` 与 OAuth 尝试；`startAuthorization/cancelAuthorization/signOut` 仅 Host 可调 |
| 工具 | 全量注册 + 自写 `tools.guard` 逐工具禁用 | `toolLoading: eager|on-demand`；工具名 `mcp__<server>__<raw>`（超长带 hash）；prompt 目录 |
| 凭据 | `${env:…}` 本插件展开 | `${credential:REF}` 由 mcp-client 解析并 redaction |
| 浏览器可调用面 | 自建 5 个 RPC 端点 | `mcpManager/watch|restart|probe` 三个 Remote；配置写入走 `settings` Remote / `configForms` |

结论：再保留一套自研舰队会与官方管理器**重复联网、重复注册工具、命名冲突**。0.5.0 改为**站在官方管理器之上**：

- 本插件不再直接 `apply`/挂载 `dsh-mcp-client`，不再维护实例状态机。
- `mcp.json` 多作用域文件仍是本插件的数据面，但只作为**注册来源**：读文件 → `ctx.mcpManager.register(name, entry)`，文件变化时增删注册。保留与 Claude Code / Codex / VS Code 共用同一份文件的价值（当前用户级 `~/.dsh/mcp.json` 里已有 `codebase-memory` 在用）。
- 官方 `mcp-manager` 配置条目（`servers`）由面板直接编辑（官方 `ctx.configForms` 共享表单，revision 栅栏 + volatile 校验），与文件来源并列展示、同等治理。
- 运行时状态、重启、探测走官方 Remote 流/一元调用；面板不再轮询状态。
- OAuth 授权/取消/登出在 Host 侧调用管理器（浏览器按钮 → 本插件鉴权 RPC → `ctx.mcpManager.startAuthorization`），填上官方「非连接器服务器没有授权入口」的已知限制。授权进度直接来自官方 `watch` 的 `authorization` 字段。
- 逐工具禁用（`disabledTools`）保留在本插件 Loader 行 `Config`（volatile），由 `tools.guard` 生效；面板经 `configForms` 编辑自己的命名空间。

---

## 2. 官方契约（0.2.3-alpha.2，已核实）

### 2.1 Host 服务 `ctx.mcpManager`

```ts
list(): McpManagedServerView[]
register(name: string, entry: McpServerRegistration): () => void
restart(name: string): Promise<void>                     // @Remote
probe(name: string, options?: McpProbeOptions): Promise<McpProbeResult>
probeFromClient(name: string, signal: AbortSignal): Promise<McpProbeResult>  // @Remote('probe')
startAuthorization(name: string): Promise<McpOAuthAttemptView>
cancelAuthorization(name: string, id: McpOAuthAttemptId): Promise<void>
signOut(name: string): Promise<void>
watch(signal: AbortSignal): AsyncIterable<McpManagedServerView[]>            // @Remote({mode:'stream'})
// 事件：ctx.on('mcp-manager/status', (name, status) => …)
```

`McpManagedServerView = { name, configured, status, authorization? }`。

状态联合（UI 必须穷举）：

```ts
| { state: 'closed'; result: McpCloseResult }
| { state: 'waiting-credentials'; lastError: string }
| { state: 'waiting-authorization'; reason: 'missing'|'expired'|'binding'|'rejected'|'scope'; lastError: string }
| { state: 'connecting'; attempt: number }
| { state: 'connected'; toolCount: number; connectedAt: number }
| { state: 'reconnecting'; attempt: number; maxAttempts: number; nextRetryAtMs: number; lastError: string }
| { state: 'failed'; reason: 'gave-up'|'reconnect-disabled'|'unclosed-generation'; lastError?: string }
| { state: 'disabled' }
| { state: 'failed'; reason: 'load'; lastError: string }
| { state: 'failed'; reason: 'cleanup'; result: McpCloseResult }
```

`register` 的条目（`McpServerRegistration`，`enabled` 由管理器固定为 true）字段：`transport`（必填）、`command/args/env/cwd`（stdio）、`url/headers`（http）、`startupTimeoutMs`（管理器默认 30000）、`closeTimeoutMs`、`toolCallTimeoutMs`、`reconnect`、`toolLoading`、`oauth`。管理器受管条目**强制** `expandTemplates: true`、`failOnStartupError: false`、`serverName = 条目键`。写入期拒绝：跨传输字段、空 command/url、OAuth 非 http、`credentialKey` 重复（形如 `mcp-client/<id>`）、与配置/注册重名。

### 2.2 Remote 面（浏览器）

只有三个：`ctx.remote.mcpManager.watch(signal?): RemoteStream<McpManagedServerView[]>`、`restart(name): Promise<RemoteResult<void>>`、`probe(name, signal?): Promise<RemoteResult<McpProbeResult>>`。**没有**配置写入与授权方法。

### 2.3 配置写入

- 浏览器：`ctx.configForms.get<T>('mcp-manager')` → `getSnapshot()/subscribe()/mutate(ops, expectedRevision?)`；`servers` 是 volatile，`env/headers` 不是 `role('secret')`（值以 `${credential:…}` 模板呈现）。
- 页面注册用 `ctx.configForms.whileServed(['mcp-manager'], …)` 门控（未组合官方管理器时不留痕）。
- Host 侧另有 `ctx.settings.mutate/replace`（同一持久化路径），本插件不使用（浏览器表单已足够）。

### 2.4 探测与 OAuth 结果

```ts
McpProbeResult = ({ ok: true; serverInfo?: {name,version}; toolNames: string[]; truncated: boolean; durationMs: number }
               | { ok: false; stage: 'connect'|'list'; message: string; durationMs: number })
               & { closeConfirmed: boolean; cleanupError?: string }
McpOAuthAttemptView = { id; phase: 'starting'|'waiting-browser'|'exchanging'|'committing'|'authorized'|'cancelled'|'failed';
                        authorizationUrl?; lastError? }
```

### 2.5 升级指南带来的硬约束（已逐条核对）

- `engines.dsh` 成为唯一兼容门（peer 不再参与），`workspace:` 值非法。
- Node `^24.22.3 || >=26.13.1`（本机 26.13.1）。
- `@deepseek-ai/cordis` 4.2.0-alpha.1、`@deepseek-ai/schemastery` 3.20.0-alpha.1、`cordis-plugin-loader` 1.2.0-alpha.1。
- Client bundle 新形制可带 `meta`（stylesheets）；旧形制仍可加载。本插件不用 CSS Modules，继续手写 `window.__ModuleLoader__.load({id, factory})` 并在 `apply` 内注入样式，**不伪造 meta**。
- `settings.section` 仍受支持；该 section 也会出现在插件页（QA 项）。
- 覆盖安装需先 `removeBundle`（README 安装说明）。

---

## 3. 命名与清单变更

| 项 | 旧 | 新 |
|---|---|---|
| npm 包 | `@junjiangao/dsh-web-mcp-manager` | `@junjiangao/dsh-mcp-manager` |
| registry id / install spec | `junjiangao/dsh-web-mcp-manager` | `junjiangao/dsh-mcp-manager`（**需先把 GitHub 仓库改名**，否则安装项 404） |
| Loader 行 id | `web-mcp-manager` | `dsh-mcp-manager`（不能叫 `mcp-manager`：与 web-app 官方行冲突） |
| 设置命名空间 | `web-mcp-manager` | `dsh-mcp-manager` |
| 显示名 | Web MCP 管理器 | MCP 管理器 / MCP manager |
| 版本 | 0.4.0 | 0.5.0（破坏性架构升级） |
| `engines` | dsh `>=0.2.0-rc.1 <0.3.0`；node `^22.19.0 \|\| >=24.0.0` | dsh `>=0.2.3-alpha.2 <0.3.0`；node `^24.22.3 \|\| >=26.13.1` |

旧行 id 的已保存配置（entry 层 `servers`/`disabledTools`）不迁移：0.4.0 的 entry 层本来就是「迁移到 mcp.json」的遗留层，且本机 profile 没有保存过该行配置。README 记录该限制。

---

## 4. Host 侧设计

### 4.1 模块

| 文件 | 处置 | 说明 |
|---|---|---|
| `src/host/index.ts` | 重写 | `inject: ['settings','connection','tools','mcpManager']`；构造控制器并 `start/dispose` |
| `src/host/controller.ts` | 重写 | 文件作用域读取/监听 → 注册表维护 → 快照 RPC → OAuth RPC；工具 guard；工作区列表 |
| `src/host/mcp-file.ts` | 保留 | 作用域文件解析、官方原子写、watch |
| `src/host/mcp-json.ts` | 扩展 | 新字段（`startupTimeoutMs`、`closeTimeoutMs`、`toolLoading`、`oauth`）；读宽写严、未知字段回写保留 |
| `src/host/mcp-sources.ts` | 保留 + 精简 | 多作用域合并/遮盖；`expandServer` 只展开 `${env:…}` 系模板，保留 `${credential:…}` 交给 mcp-client |
| `src/host/interpolate.ts` | 保留 | 模板展开实现不变 |
| `src/host/keyed-queue.ts` | 保留 | 文件写入串行化 |
| `src/host/rpc-channel.ts` | 保留 | 官方 `connection.fetch.register` 传输；端点表更新 |
| `src/host/mcp-config.ts` | 删除/替换 | 原 `toMcpConfig`（拼 dsh-mcp-client Config）改由新 `registration.ts` 生成 `McpServerRegistration` |
| `src/host/registration.ts` | 新增 | 每个文件服务器的注册条目；冲突/失败记录；增删改对账 |
| `src/settings.ts` | 重写 | `Config = { disabledTools: dict(array(string)).volatile() }`；服务器字段校验/默认值搬到 `mcp-json` |
| `src/protocol.ts` | 重写 | 新快照请求/文件写请求/OAuth 请求解析与投影 |
| `src/types.ts` | 重写 | 端点表、快照/运行视图类型、`PLUGIN_*` 常量新值 |

### 4.2 启动与对账

1. `apply(ctx, config)`：创建控制器，注入 `ctx.mcpManager`。
2. 解析工作区（`workspaceRegistry`，可选）、profile 目录、`$DSH_HOME`；解析三个可写作用域 + 项目级兼容文件。
3. 读文件 → 合并 → 对每个 enabled 且无冲突的服务器 `ctx.mcpManager.register(name, entry)`；保存 disposer；冲突/非法条目记录为 `registration.error`，面板可见但不阻断其它服务器。
4. 监听文件（250ms 去抖）与 `mcp-manager/status` 事件；文件变化重新对账，状态变化标记快照脏并广播（浏览器另走官方 watch，不依赖本插件推送）。
5. `dispose`：按 name 撤销注册（撤销后管理器卸载实例、撤下工具）。

### 4.3 快照 RPC（保留现有鉴权传输）

端点：`snapshot`、`upsertServer`、`removeServer`、`setServerEnabled`（文件作用域）＋ `authorize`、`cancelAuthorization`、`signOut`（OAuth）＋ `probe`（带 Host 选项的可选端点，默认走 Remote 即可，保留此端点用于「深入探测」需要自定义页数上限的情况，可后置）。

`Snapshot` 字段：

```ts
{
  sources: SourceRow[]                       // 路径/可写/兼容/存在/数量/错误/条目问题
  servers: FileServerView[]                  // id/scope/path/字段/secret 状态/模板名/shadowed/registration
  tools: ManagedToolView[]                   // mcp__* 公开名、描述、参数、enabled、serverName
  workspaces: WorkspaceView[]
  projectPath?: string
  settingsWritable: boolean
  errors?: string[]
}
```

`FileServerView` 保留 0.4.0 的「密钥只出存在性状态、模板只出名字」的脱敏约束；新增 `advanced`（超时/重连/toolLoading/oauth 的**非敏感**部分）与 `registration`（`{ registered: boolean; error?: string; collisions?: string[] }`）。

### 4.4 OAuth RPC

- `authorize { name }`：校验 name 在 `ctx.mcpManager.list()` 中且条目配置了 OAuth（由管理器抛错兜底）→ 返回 `McpOAuthAttemptView`。
- `cancelAuthorization { name, id }`、`signOut { name }`：透传。
- 不缓存状态：授权进度由官方 watch 的 `authorization` 字段与状态事件驱动。
- 失败分类：`mcpManager` 抛出的 `MCP_OAUTH_FAILED`、未知服务器、清理未完成 → 映射为 `validation|not-found|conflict`。

### 4.5 工具策略

- `disabledTools: Record<serverName, string[]>`（公开工具名）继续由 `tools.guard` 拒绝；Host 从自己的 volatile `Config` 读取。
- 面板经 `configForms.get('dsh-mcp-manager')` 写自己的命名空间（官方表单，revision 栅栏）。
- `toolLoading: on-demand` 的服务器在面板显示「按需加载」与非空 catalog 说明；工具列表来自 `ctx.tools.schemas()`（未加载时为空，不做假数据）。

---

## 5. Client 侧设计

### 5.1 模块

| 文件 | 处置 | 说明 |
|---|---|---|
| `src/client/index.ts` | 重写 | `inject: ['connection','slots','locale','configForms','remote','remote.mcpManager']`；注册 `settings.section` id `mcp`；创建 store/api/forms |
| `src/client/manager-store.ts` | 重写 | 双源状态：`config`（本插件 RPC 快照）+ `managed`（官方 watch 流）+ `entryForm`（官方 mcp-manager 表单）+ `ownForm`（disabledTools 表单）；合并视图、操作、错误 |
| `src/client/api.ts` | 保留改造 | RPC 调用 + 新 OAuth 端点；官方 remote 调用封装（`restart`/`probe`/`watch`）放在 store |
| `src/client/entry-form.ts` | 重写 | 两个官方表单：`mcp-manager`（配置条目：增删改启停）与 `dsh-mcp-manager`（disabledTools） |
| `src/client/McpSection.tsx` | 重写 | 页面壳：标题/概览/工具栏/列表/来源/弹窗 |
| `src/client/ServerCard.tsx` | 新增 | 服务器卡片（状态、操作、工具、配置摘要） |
| `src/client/ServerEditor.tsx` | 新增 | 新增/编辑表单（文件作用域 + 配置条目两条写入路径） |
| `src/client/ProbeDialog.tsx` | 新增 | 探测结果 |
| `src/client/OAuthDialog.tsx` | 新增 | 授权进度/取消/登出 |
| `src/client/status.ts` | 新增 | 状态→标签/语气/说明的纯函数（可单测） |
| `src/client/draft.ts` | 保留改造 | 草稿/秘密/高级字段；作用域含 `entry` |
| `src/client/panel.css.ts` | 新增 | 页面样式字符串（`apply` 注入 `<style>`，dispose 移除） |
| `src/client/locales.ts` | 重写 | 中英双语键；新增状态/OAuth/探测/来源/工具文案 |

### 5.2 数据流

```
文件 mcp.json ──watch──▶ Host controller ──register/dispose──▶ ctx.mcpManager ──▶ mcp-client 实例
      ▲                        │                                    │
      │ RPC 写                  │ snapshot RPC                       │ watch / restart / probe (Remote)
      │                        ▼                                    ▼
   Browser ◀──────────── store(config ∪ managed) ◀───────────── 浏览器
      ▲                        ▲
      └── configForms.get('mcp-manager') / ('dsh-mcp-manager')（官方 settings Remote）
```

合并规则：同名服务器以「配置条目 → 文件作用域」标注来源；`managed` 列表按 name 关联；文件服务器未注册成功时显示原因；`managed` 中 `configured:false` 的清理残留单独分组（「已移除，清理未完成」）。

### 5.3 页面信息架构

1. **页头**：标题「MCP 服务」；概览胶囊：已连接 N / 连接中 N / 需处理 N / 已停用 N（点击过滤）；右侧「新增服务」「刷新」。
2. **工具栏**：搜索（名称/命令/URL/工具）、来源分段（全部 / 配置条目 / mcp.json / 插件注册）、状态下拉（全部/已连接/连接中/失败/已停用/等待授权）。
3. **服务器列表**（卡片）：
   - 首行：状态点 + 名称 + 传输徽标 + 来源徽标 + 连接器账号徽标（有 OAuth 时）+ 启用开关。
   - 状态说明：`已连接 · 12 个工具 · 3 分钟前`、`重连中 2/10 · 5 秒后重试`、`等待授权 · 需要 OAuth`、`缺少凭据 · GITHUB_TOKEN`、`失败 · 达到重连上限`、`已停用`、`清理未完成`。
   - 操作区：`重启`、`探测`、`授权/退出`、更多菜单（编辑、删除、复制 JSON、查看工具）。
   - 展开区：命令或 URL、参数、env/headers（脱敏/模板名）、超时/重连/按需加载摘要；工具列表（可搜索、逐工具开关、参数 JSON 折叠），按需加载服务器显示 catalog 提示；`mcp.json` 来源显示路径与遮盖提示。
4. **来源面板**（可折叠）：每个 `mcp.json` 作用域一行，路径、可写/只读/不存在、条目数、解析错误、被遮盖条目数；提示「项目级兼容文件 `.mcp.json` 只读」。
5. **新增/编辑对话框**：
   - 目标位置：配置条目（默认，推荐）/ 项目级 / 配置级 / 用户级；配置条目用官方表单写入，文件作用域走 RPC。
   - 基本：id（文件）/名称、传输（stdio / streamable-http）；stdio：command、args（逐项）、cwd；http：url。
   - 环境/请求头：键值增删、敏感标记（文件作用域）、模板保护（`${…}` 只读）。
   - 高级：启动超时、关闭超时、工具调用超时、重连策略（开关 + 首延迟/最大延迟/最大次数）、工具加载（eager / on-demand）、OAuth（`credentialKey`、`clientId`、`scope`、请求/授权超时）。
   - 校验与错误行内呈现；保存中禁用；配置条目冲突（revision）提示刷新。
6. **探测对话框**：连接/列举阶段、耗时、服务器身份、工具名列表（含截断提示）、`closeConfirmed`/`cleanupError`；失败显示阶段与消息。
7. **OAuth 对话框**：阶段时间线（starting → waiting-browser → exchanging → committing → authorized）、打开授权页、取消、失败原因、退出登录。
8. **状态与可访问性**：首次加载骨架；错误横幅（重试）；`aria-live` 操作结果；键盘可达；窄屏（<768px）单列；暗色仅用 `--dsw-alias-*`。

### 5.4 与官方视觉对齐

- 组件全部走 `@deepseek-ai/dsh-client-ui-primitives`（`Button/Input/Checkbox/Switch/Tag/StateDot/SegmentedControl/RiskConfirmation/Modal/Toast/TextShimmer`），不新造基础控件。
- 状态→`StateDot`：connected=done、connecting/reconnecting=ongoing、waiting-*=warning、failed=error、disabled/closed=idle；`Tag` tone 用 success/info/warning/danger/neutral/outline。
- 颜色只用 `--dsw-alias-*`、圆角 `--dsw-radius-md`、字体 `--dsw-font-*`，暗色自动跟随；不覆盖官方 CSS。

---

## 6. 兼容与迁移

- `mcp.json` 旧字段（`reconnect`、`toolCallTimeoutMs`、`sensitive`、`envSensitive`、`headerSensitive`、`enabled/disabled`、VS Code `servers` 别名与 `http`/`streamableHttp` 写法）继续读入。
- 新增可写字段：`startupTimeoutMs`、`closeTimeoutMs`、`toolLoading`、`oauth`。
- 0.4.0 的 entry 层（Loader `Config.servers`）不再支持；README 记录迁移方式（粘贴到对应 `mcp.json` 或官方配置条目）。
- 0.4.0 的自建 RPC 端点名保留语义（snapshot/upsert/remove/setEnabled），但响应结构升级为 v2；无外部消费者（面板同版本发布）。
- Loader 行改名后，已保存的旧行配置不继承；README 说明。

---

## 7. 验证计划（不做 profile 安装）

1. `pnpm install`（更新 lockfile；devDeps 0.2.3-alpha.2）。
2. `pnpm typecheck`。
3. `pnpm test`：控制器注册对账、文件 schema 新字段、模板展开、OAuth 端点校验、状态映射、面板渲染（含空/错误/探测/OAuth 态）。
4. `pnpm build`；`npm pack --dry-run` 核对产物与 `files`。
5. `node scripts/check-dsh-compat.mjs 0.2.3-alpha.2`（改为 engines-first）。
6. 生成 `preview/mcp-panel-preview.html`：同一套组件 + 模拟数据 + 官方主题 token，覆盖浅色/暗色与主要状态，作为 UI 交付预览。
7. 未验证项如实报告：真实 Host 组合下的运行行为、真实 MCP 服务器的连接/授权链路。

---

## 8. 风险

| 风险 | 处理 |
|---|---|
| `ctx.mcpManager` 服务在目标 profile 不存在（未组合官方管理器） | `inject` 缺服务时插件不激活；README 注明需要 `dsh-web-app` 组合。缺失时不会静默降级成自研舰队。 |
| 文件服务器与配置条目重名 | 注册被管理器拒绝 → 面板显示「已被配置条目占用」，不覆盖用户配置。 |
| `configForms.get('mcp-manager')` 在旧版组合不可用 | 表单快照 `unavailable` → 配置条目区块降级为只读提示，`mcp.json` 与状态/重启/探测仍可用。 |
| OAuth 需要 `credentials/authorization/webServer` 服务 | 授权按钮在 `startAuthorization` 抛 `MCP_OAUTH_FAILED` 时显示明确原因；不改用其它服务。 |
| 重启有工具空窗（官方行为） | README 说明；UI 的「重启」只做单服务器重建。 |
| `on-demand` 服务器工具列表为空 | 显示「按需加载」说明与 probe 得到的工具名，不伪造已注册工具。 |
