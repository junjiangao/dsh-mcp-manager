/** Host settings schema for this plugin's own Loader entry. */

import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { SettingsNamespace as DshSettingsNamespace } from '@deepseek-ai/dsh-settings'
import { MCP_MANAGER_NAMESPACE, type ServerTransport } from './types.ts'

export const MANAGER_NAMESPACE = MCP_MANAGER_NAMESPACE as DshSettingsNamespace

/**
 * The Loader entry's schema, which is also the form the settings page renders.
 *
 * The `mcp.json` file scopes and the official `mcp-manager` configuration are
 * edited elsewhere; this entry owns one field only: the per-server list of
 * public tool names the panel disables. It is `volatile()` so a committed edit
 * reaches the running guard without re-registering the plugin.
 */
export const Config = z.object({
  disabledTools: z.dict(z.array(z.string())).default({}).volatile(),
}) as z<ManagerSettingsInput, ManagerSettings>

/** The schema under its historical name; both refer to the same entry config. */
export const ManagerSettingsSchema = Config

/** The shape a composition file writes: plain values, every field optional. */
export interface ManagerSettingsInput {
  /** Per-server disabled tool names. */
  disabledTools?: Record<string, string[]>
}

/** Resolved manager config as the Host hands it to `apply`: a live ref. */
export interface ManagerSettings {
  /** Per-server disabled tool names. */
  disabledTools: Volatile<Record<string, string[]>>
}

/** Validate the entry document before it is used.
 * @param value - per-server disabled tool names.
 * @throws TypeError for a malformed shape, Error for a rejected name.
 */
export function validateDisabledTools(value: Readonly<Record<string, readonly string[]>>): void {
  for (const [id, tools] of Object.entries(value)) {
    if (!/^[-A-Za-z0-9_]{1,32}$/.test(id)) throw new Error(`disabledTools key ${JSON.stringify(id)} must be a server name`)
    if (!Array.isArray(tools) || tools.some(tool => typeof tool !== 'string' || tool.length === 0 || tool.length > 200)) {
      throw new Error(`disabledTools[${JSON.stringify(id)}] must be a list of tool names`)
    }
  }
}

/** The transport values the panel offers; re-exported here so older imports keep working. */
export type { ServerTransport }
