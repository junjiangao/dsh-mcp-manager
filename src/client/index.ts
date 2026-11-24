/** Browser entry for Settings → MCP. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { McpLocaleKey } from './locales.ts'
import { en, zh } from './locales.ts'
import { createManagerApi } from './api.ts'
import { createOwnForm, createUpstreamForm } from './entry-form.ts'
import { createManagerStore } from './manager-store.ts'
import { McpSection, type McpSectionInjected } from './McpSection.tsx'
import { MCP_MANAGER_NAMESPACE, MCP_UPSTREAM_NAMESPACE } from '../types.ts'
import type { UpstreamConfig } from './summary.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.mcpManager': McpLocaleKey
  }
}

export const NS = 'settings.mcpManager' as const
/**
 * `remote.mcpManager` carries the official live status stream, restart, and
 * probe. `configForms` carries the two official entry forms: the upstream
 * `mcp-manager` entry and this plugin's own entry. `connection` carries the
 * file-scope RPC and the Host-only OAuth operations.
 */
export const inject = ['connection', 'remote', 'remote.mcpManager', 'slots', 'locale', 'configForms']

export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-mcp-manager: dictionaries')
  const api = createManagerApi(ctx)
  const upstream = createUpstreamForm(ctx.configForms.get<UpstreamConfig>(MCP_UPSTREAM_NAMESPACE))
  const own = createOwnForm(ctx.configForms.get<{ disabledTools?: Record<string, string[]> }>(MCP_MANAGER_NAMESPACE))
  const store = createManagerStore(ctx, api, upstream, own, t)
  ctx.effect(() => () => store.dispose(), 'dsh-mcp-manager: store')
  const injected = (): McpSectionInjected => ({ store })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'mcp',
    order: 20,
    label: () => t('title'),
    locale: NS,
    inject: injected,
  }, McpSection))
}

export { McpSection }
export type { McpSectionInjected, McpSectionProps } from './McpSection.tsx'
