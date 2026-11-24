/**
 * Adapter between this plugin's stored server shape and the official MCP
 * manager's registration entry, plus the schema-backed validation that keeps a
 * bad file entry from reaching `ctx.mcpManager.register()`.
 */

import { Config as McpClientConfig, type Config as McpServerConfig } from '@deepseek-ai/dsh-mcp-client'
import type { McpServerRegistration } from '@deepseek-ai/dsh-mcp-manager'
import type { StoredServer } from '../types.ts'

/** Defaults the official manager applies to an entry it receives. */
const REGISTRATION_DEFAULTS = {
  failOnStartupError: false as const,
  expandTemplates: true as const,
}

/**
 * Project one stored server into the manager's registration entry.
 *
 * The manager forces `expandTemplates: true` and `failOnStartupError: false`
 * itself; repeating them here keeps the entry self-describing and makes the
 * validation candidate identical to what the manager builds.
 * @param server - the stored server, environment templates already expanded.
 * @returns the registration entry; `enabled` is deliberately absent.
 */
export function toRegistration(server: StoredServer): McpServerRegistration {
  const shared = {
    transport: server.transport,
    startupTimeoutMs: server.startupTimeoutMs,
    closeTimeoutMs: server.closeTimeoutMs,
    toolCallTimeoutMs: server.toolCallTimeoutMs,
    reconnect: { ...server.reconnect },
    toolLoading: server.toolLoading,
    ...server.oauth === undefined ? {} : { oauth: { ...server.oauth } },
  }
  if (server.transport === 'stdio') {
    return {
      ...shared,
      command: server.command,
      args: [...server.args],
      cwd: server.cwd,
      env: { ...server.env },
    }
  }
  return {
    ...shared,
    url: server.url,
    headers: { ...server.headers },
  }
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
export function validateMcpConfig(server: StoredServer): void {
  const candidate = {
    ...REGISTRATION_DEFAULTS,
    serverName: server.id,
    ...toRegistration(server),
  }
  try {
    McpClientConfig(candidate as unknown as McpServerConfig)
  } catch (error) {
    const message = `MCP configuration is invalid: ${error instanceof Error ? error.message : String(error)}`
    throw Object.assign(new Error(message), { code: 'MCP_CONFIG_VALIDATION' })
  }
}
