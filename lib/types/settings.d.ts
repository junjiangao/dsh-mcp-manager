/** Host settings schema for this plugin's own Loader entry. */
import type { Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { SettingsNamespace as DshSettingsNamespace } from '@deepseek-ai/dsh-settings';
import { type ServerTransport } from './types.ts';
export declare const MANAGER_NAMESPACE: DshSettingsNamespace;
/**
 * The Loader entry's schema, which is also the form the settings page renders.
 *
 * The `mcp.json` file scopes and the official `mcp-manager` configuration are
 * edited elsewhere; this entry owns one field only: the per-server list of
 * public tool names the panel disables. It is `volatile()` so a committed edit
 * reaches the running guard without re-registering the plugin.
 */
export declare const Config: z<ManagerSettingsInput, ManagerSettings>;
/** The schema under its historical name; both refer to the same entry config. */
export declare const ManagerSettingsSchema: z<ManagerSettingsInput, ManagerSettings>;
/** The shape a composition file writes: plain values, every field optional. */
export interface ManagerSettingsInput {
    /** Per-server disabled tool names. */
    disabledTools?: Record<string, string[]>;
}
/** Resolved manager config as the Host hands it to `apply`: a live ref. */
export interface ManagerSettings {
    /** Per-server disabled tool names. */
    disabledTools: Volatile<Record<string, string[]>>;
}
/** Validate the entry document before it is used.
 * @param value - per-server disabled tool names.
 * @throws TypeError for a malformed shape, Error for a rejected name.
 */
export declare function validateDisabledTools(value: Readonly<Record<string, readonly string[]>>): void;
/** The transport values the panel offers; re-exported here so older imports keep working. */
export type { ServerTransport };
//# sourceMappingURL=settings.d.ts.map