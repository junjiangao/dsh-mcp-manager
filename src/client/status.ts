/** Runtime status → panel vocabulary. Pure: the caller passes the translator and clock. */

import type { McpManagedServerStatus, McpManagedServerView } from '@deepseek-ai/dsh-mcp-manager'
import type { McpLocaleKey } from './locales.ts'

export type StatusTone = 'done' | 'ongoing' | 'warning' | 'error' | 'idle'

export interface StatusText {
  readonly tone: StatusTone
  readonly label: string
  readonly detail?: string
}

type Translate = (key: McpLocaleKey, params?: Record<string, unknown>) => string

/**
 * Describe one managed server's status.
 * @param view - the manager's view, or `undefined` when the status stream has not delivered it yet.
 * @param t - the page translator.
 * @param now - current epoch milliseconds, for relative times.
 * @returns the state dot tone, the short label, and the explanatory line.
 */
export function describeStatus(view: McpManagedServerView | undefined, t: Translate, now: number = Date.now()): StatusText {
  if (view === undefined) return { tone: 'idle', label: t('status.unknown') }
  return describeStatusValue(view.status, t, now)
}

/** Describe one status value; exported for tests that do not build a view. */
export function describeStatusValue(status: McpManagedServerStatus, t: Translate, now: number = Date.now()): StatusText {
  switch (status.state) {
    case 'connected':
      return {
        tone: 'done',
        label: t('status.connected'),
        detail: t('detail.connected', { count: status.toolCount, time: clock(status.connectedAt) }),
      }
    case 'connecting':
      return { tone: 'ongoing', label: t('status.connecting'), detail: t('detail.connecting', { attempt: status.attempt + 1 }) }
    case 'reconnecting':
      return {
        tone: 'ongoing',
        label: t('status.reconnecting'),
        detail: t('detail.reconnecting', {
          attempt: status.attempt,
          max: status.maxAttempts,
          time: secondsUntil(status.nextRetryAtMs, now),
        }),
      }
    case 'waiting-credentials':
      return { tone: 'warning', label: t('status.waitingCredentials'), detail: t('detail.waitingCredentials', { error: status.lastError }) }
    case 'waiting-authorization':
      return {
        tone: 'warning',
        label: t('status.waitingAuthorization'),
        detail: t('detail.waitingAuthorization', { reason: authorizationReason(status.reason, t) }),
      }
    case 'failed': {
      if ('reason' in status && status.reason === 'cleanup') {
        return { tone: 'error', label: t('status.cleanup'), detail: t('detail.cleanup') }
      }
      if ('reason' in status && status.reason === 'load') {
        return { tone: 'error', label: t('status.failed'), detail: t('reason.load', { error: status.lastError }) }
      }
      const reason = 'reason' in status ? status.reason : 'gave-up'
      const detail = reason === 'gave-up'
        ? t('reason.gaveUp')
        : reason === 'reconnect-disabled' ? t('reason.reconnectDisabled') : t('reason.unclosed')
      const lastError = 'lastError' in status ? status.lastError : undefined
      return { tone: 'error', label: t('status.failed'), detail: lastError === undefined ? detail : `${detail} · ${lastError}` }
    }
    case 'disabled':
      return { tone: 'idle', label: t('status.disabled') }
    case 'closed':
      return { tone: 'idle', label: t('status.closed') }
    default:
      return { tone: 'idle', label: t('status.unknown') }
  }
}

/** The official state-dot value for a status tone. */
export function dotState(tone: StatusTone): 'done' | 'ongoing' | 'warning' | 'error' | 'idle' {
  return tone
}

/** The official tag tone for a status tone. */
export function tagTone(tone: StatusTone): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  switch (tone) {
    case 'done': return 'success'
    case 'ongoing': return 'info'
    case 'warning': return 'warning'
    case 'error': return 'danger'
    case 'idle': return 'neutral'
  }
}

/** Count the summaries the header shows. */
export interface StatusCounts {
  readonly total: number
  readonly connected: number
  readonly busy: number
  readonly attention: number
  readonly disabled: number
}

export function countStatuses(views: readonly (McpManagedServerView | undefined)[]): StatusCounts {
  let connected = 0
  let busy = 0
  let attention = 0
  let disabled = 0
  for (const view of views) {
    const state = view?.status.state
    if (state === 'connected') connected += 1
    else if (state === 'connecting' || state === 'reconnecting') busy += 1
    else if (state === 'waiting-credentials' || state === 'waiting-authorization' || state === 'failed') attention += 1
    else if (state === 'disabled') disabled += 1
  }
  return { total: views.length, connected, busy, attention, disabled }
}

function authorizationReason(reason: string, t: Translate): string {
  switch (reason) {
    case 'missing': return t('authReason.missing')
    case 'expired': return t('authReason.expired')
    case 'binding': return t('authReason.binding')
    case 'rejected': return t('authReason.rejected')
    case 'scope': return t('authReason.scope')
    default: return reason
  }
}

/** Local wall-clock time as `HH:MM`; fixed so the line reads the same on every host locale. */
function clock(epochMs: number): string {
  const date = new Date(epochMs)
  if (Number.isNaN(date.getTime())) return String(epochMs)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function secondsUntil(epochMs: number, now: number): string {
  const seconds = Math.max(0, Math.ceil((epochMs - now) / 1000))
  return `${String(seconds)} s`
}
