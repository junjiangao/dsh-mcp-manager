# DSH MCP Manager

DeepSeek Harness 的 MCP 控制面板。插件在**设置 → MCP** 增加一个页面，把两类 MCP 服务放进同一份列表：

- 官方 `mcp-manager` 配置条目（`ctx.mcpManager`）；
- 项目、配置（profile）、用户三级 `mcp.json` 文件。

页面显示官方管理器上报的实时状态，并支持重启、探测、发起授权、退出登录、启停服务，以及按 agent 开关单个 MCP 工具。

需要 DSH `>=0.2.3-alpha.2 <0.3.0`（由 `engines.dsh` 声明）。

## 安装

```sh
dsh plugin --profile web add github:junjiangao/dsh-mcp-manager
```

该仓库名需要先完成重命名：注册身份与安装 spec 已从 `junjiangao/dsh-web-mcp-manager` 改为 `junjiangao/dsh-mcp-manager`，在 GitHub 上重命名仓库后才能用新 spec 安装。需要固定分支时：

```sh
dsh plugin --profile web add github:junjiangao/dsh-mcp-manager#main
```

从改名前版本升级时，先移除旧安装：

```sh
dsh plugin --profile web remove dsh-web-mcp-manager
dsh plugin --profile web add github:junjiangao/dsh-mcp-manager
```

插件以 `@junjiangao/dsh-mcp-manager` 挂载，Loader 条目 id 为 `dsh-mcp-manager`（见 `cordis.patch.yml`）。

## 工作方式

插件不自建 MCP 运行时：它把每个生效的 `mcp.json` 服务注册到官方 `ctx.mcpManager`，再把官方状态流、重启和探测 remote 投影到页面。官方配置条目由浏览器通过共享的 `ctx.configForms` 表单（命名空间 `mcp-manager`）读写，因此编辑走官方 schema、revision 防护和持久化。

两处对官方客户端接口的扩展（代码内均有说明）：

- **OAuth**：DSH 0.2.3 没有面向浏览器的授权 remote，页面通过挂在 Connection `/api` 通道上的 Host RPC 调用 `startAuthorization`、`cancelAuthorization`、`signOut`。
- **逐工具开关**：保存在本插件自己的 volatile 条目配置 `disabledTools` 中，由 `tools.guard` 与按 agent 的 `tools.restrict` 执行，不修改官方条目。

## 文件来源

同名服务只保留优先级最高的一份定义，其余在页面标注为“被覆盖”，不会静默丢弃。

| 级别 | 路径 | 说明 |
|---|---|---|
| 项目级 | `<workspace>/.dsh/mcp.json` | 从工作区注册表选择；Host 拒绝写入未注册目录 |
| 项目级兼容 | `<workspace>/.mcp.json` | Claude Code 约定，只读，优先级低于项目级自身文件 |
| 配置级 | `~/.dsh/profiles/<profile>/mcp.json` | 新建服务的默认落点 |
| 用户级 | `~/.dsh/mcp.json` | 尊重 `$DSH_HOME` |

文件格式与周边生态一致，同一份文件可被其他 MCP 客户端直接读取：

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${env:GITHUB_TOKEN}" },
      "sensitive": { "env": ["GITHUB_TOKEN"] }
    },
    "web": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```

- 支持 `stdio` 与 `streamable-http`；`sse` 会得到明确报错，不会静默降级。
- `${env:NAME}`、`${NAME}`、`${NAME:-fallback}` 只在写入 `dsh-mcp-client` 前展开；页面永远拿不到真实值，文件中保留模板。`${credential:mcp-client/<id>}` 原样交给官方凭据服务。
- 密钥按键名或 `sensitive` 列表掩码；未改动的掩码行以保留标记回传，而不是回传值。
- 写入走跨进程文件锁并以 `0600` 权限原子替换。JSON 无效时拒绝写入，不覆盖原文件。
- 会监视文件变化，在编辑器里修改后会重新对齐运行中的注册。

## 验证

```sh
pnpm test                    # 16 个套件，115 个测试
pnpm typecheck
pnpm build
pnpm check:compat            # 默认读已安装 dsh，也可传入版本号
pnpm preview                 # 生成 preview/mcp-panel-preview.html
```

`pnpm preview` 用真实面板组件配固定数据渲染，是静态评审页，不是运行中的 Host。

## 已知限制

- 没有 Host 运行时就无法测试真实 MCP 连接；请在实际 profile 中使用「探测」。
- OAuth 只负责打开官方管理器返回的授权地址，完成授权仍在 DSH 的浏览器流程中。
- 跨客户端的可视化文件（`.mcp.json`）可读但永不写入。
- 旧版条目层 `Config.servers` 中的数据不会自动迁移，请移入 `mcp.json` 或重新添加到官方条目。
