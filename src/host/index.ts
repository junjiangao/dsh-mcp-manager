/** Host entry for the MCP manager plugin. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-mcp-manager'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-tools'
import { McpManagerController } from './controller.ts'
import type { ManagerSettings } from '../settings.ts'

export const name = '@junjiangao/dsh-mcp-manager'

/**
 * The Loader entry's config schema. dsh renders this on the settings page and
 * hands the resolved refs to {@link apply}; the panel writes it back through
 * `ctx.configForms` against this same entry id.
 */
export { Config } from '../settings.ts'
/**
 * `mcpManager` is a hard dependency: without the official manager there is no
 * fleet to manage, so the plugin must not load (README documents the
 * `dsh-web-app` composition requirement). `connection` is the authenticated
 * carrier for the file-scope RPC and the Host-only OAuth operations.
 */
export const inject = ['settings', 'connection', 'tools', 'mcpManager']

/**
 * Start the controller on the Host Cordis fiber.
 * @param ctx - the Host plugin context.
 * @param config - the entry's resolved volatile refs.
 */
export async function apply(ctx: Context, config: ManagerSettings): Promise<void> {
  const controller = new McpManagerController(ctx as ConstructorParameters<typeof McpManagerController>[0], config)
  try {
    await controller.start()
  } catch (error) {
    // `start()` registers an RPC route before the initial reconciliation. If
    // startup fails, make that route and any partial registration disappear
    // before letting Cordis roll back the plugin fiber.
    await controller.dispose()
    throw error
  }
  ctx.effect(() => async () => { await controller.dispose() }, 'dsh-mcp-manager: dispose')
}

export { McpManagerController }
