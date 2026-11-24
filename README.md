# DSH MCP Manager

MCP control panel for DeepSeek Harness. The plugin adds a **Settings → MCP** section that manages MCP servers from two sources in one list:

- the official `mcp-manager` configuration entries (`ctx.mcpManager`), and
- `mcp.json` files in the project, profile, and user scopes.

The panel shows the live status the official manager reports, and can restart, probe, authorize, sign out, enable or disable a server, and switch individual MCP tools per agent.

Requires DSH `>=0.2.3-alpha.2 <0.3.0` (declared as `engines.dsh`).

## Install

```sh
dsh plugin --profile web add github:junjiangao/dsh-mcp-manager
```

The repository must exist under that name first; the registry identity and install spec were renamed from `junjiangao/dsh-web-mcp-manager`, so rename the GitHub repository before installing from the new spec. To pin a branch:

```sh
dsh plugin --profile web add github:junjiangao/dsh-mcp-manager#main
```

Upgrading from the pre-rename package requires removing the old install first:

```sh
dsh plugin --profile web remove dsh-web-mcp-manager
dsh plugin --profile web add github:junjiangao/dsh-mcp-manager
```

The plugin mounts as `@junjiangao/dsh-mcp-manager`; the Loader row id is `dsh-mcp-manager` (see `cordis.patch.yml`).

## How it works

The plugin owns no MCP runtime of its own. It registers each effective `mcp.json` server with the official `ctx.mcpManager`, then projects the official status stream, restart, and probe remotes into the panel. The browser reads the official configuration entries through the shared `ctx.configForms` form (namespace `mcp-manager`), so edits use the official schema, revision fencing, and persistence.

Deviations from the official client surface, both documented in code:

- **OAuth** has no browser remote in DSH 0.2.3, so the panel calls `startAuthorization`, `cancelAuthorization`, and `signOut` through a small Host RPC carrier mounted on Connection's `/api` channel.
- **Per-tool disable** is stored in this plugin's own volatile entry config (`disabledTools`), enforced with a `tools.guard` and per-agent `tools.restrict`; it does not modify the official entry.

## File sources

One name resolves to the highest-precedence definition; the rest are shown as *shadowed* rather than dropped.

| Scope | Path | Notes |
|---|---|---|
| project | `<workspace>/.dsh/mcp.json` | selected from the workspace registry; the Host refuses any path outside a registered root |
| project (compat) | `<workspace>/.mcp.json` | Claude Code's file, read-only, ranks below the project file |
| profile | `~/.dsh/profiles/<profile>/mcp.json` | default target for a new server |
| user | `~/.dsh/mcp.json` | honours `$DSH_HOME` |

The file format is the ecosystem format, so the same files work in other MCP clients:

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

- `stdio` and `streamable-http` are supported; `sse` is refused with a clear message.
- `${env:NAME}`, `${NAME}`, and `${NAME:-fallback}` expand only on the way into `dsh-mcp-client`; the panel never receives the value and the file keeps the template. `${credential:mcp-client/<id>}` stays intact for the official credentials service.
- Secrets are masked by name or by the `sensitive` list; an unchanged masked row is written back as a keep marker instead of a value.
- Writes take the cross-process lock and commit through an atomic rename at mode `0600`. A file with invalid JSON refuses the write instead of being overwritten.
- Files are watched, so editing one in an editor reconciles the running registrations.

## Verification

```sh
pnpm test                    # 16 suites, 115 tests
pnpm typecheck
pnpm build
pnpm check:compat            # installed dsh, or pass a version
pnpm preview                 # self-contained UI preview in preview/mcp-panel-preview.html
```

`pnpm preview` renders the real panel components over fixed fixture data; it is a review page, not a running Host.

## Known limits

- The panel cannot test a real MCP connection without the Host runtime; use **Probe** in a live profile.
- OAuth authorization opens the browser URL the official manager returns; completing it still happens in the DSH browser flow.
- A visual cross-client file (`.mcp.json`) is readable but never written.
- Values inherited from an older entry-layer `Config.servers` are not migrated; move them to `mcp.json` or re-add them to the official entry.
