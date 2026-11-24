/** One server row: identity, source, live status, actions, and the tool policy. */

import { useMemo, useState } from 'react'
import {
  Button, IconCloseOutlineRegular, IconCopyOutlineRegular, IconEditOutlineRegular, IconPlayOutlineRegular,
  IconRefreshOutlineRegular, Input, StateDot, Switch, Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { McpLocaleKey } from './locales.ts'
import { cx } from './panel-css.ts'
import { describeStatus } from './status.ts'
import type { ServerSummary } from './summary.ts'

/** Everything the card may ask the page to do. */
export interface ServerCardProps {
  readonly row: ServerSummary
  readonly t: (key: McpLocaleKey, params?: Record<string, unknown>) => string
  readonly busy: boolean
  readonly onToggle: (row: ServerSummary, enabled: boolean) => void
  readonly onEdit: (row: ServerSummary) => void
  readonly onDelete: (row: ServerSummary) => void
  readonly onRestart: (row: ServerSummary) => void
  readonly onProbe: (row: ServerSummary) => void
  readonly onAuthorize: (row: ServerSummary) => void
  readonly onSignOut: (row: ServerSummary) => void
  readonly onToolToggle: (row: ServerSummary, tool: string, enabled: boolean) => void
  readonly onCopy: (row: ServerSummary) => void
}

export function ServerCard(props: ServerCardProps) {
  const { row, t, busy } = props
  const [toolFilter, setToolFilter] = useState('')
  const status = useMemo(() => describeStatus(row.runtime, t), [row.runtime, t])
  const tools = useMemo(() => {
    const needle = toolFilter.trim().toLocaleLowerCase()
    if (needle === '') return row.tools
    return row.tools.filter(tool => `${tool.name} ${tool.description}`.toLocaleLowerCase().includes(needle))
  }, [row.tools, toolFilter])
  const sourceLabel = row.kind === 'entry' ? t('scope.entry') : scopeLabel(row.scope, t)
  const canEdit = row.writable
  const oauth = row.oauth !== undefined
  const authorizationPending = row.runtime?.status.state === 'waiting-authorization'
  const registrationNote = row.registration !== undefined && row.registration.state !== 'registered' && row.registration.state !== 'disabled'
    ? registrationText(row, t)
    : undefined

  return (
    <article className={cx('dsh-mcp-card')} data-disabled={!row.enabled}>
      <div className={cx('dsh-mcp-card-head')}>
        <span className={cx('dsh-mcp-name')}>{row.name}</span>
        <span className={cx('dsh-mcp-head-tags')}>
          <Tag tone={row.kind === 'entry' ? 'info' : 'outline'}>{sourceLabel}</Tag>
          {row.compat ? <Tag tone="neutral">{t('sources.compat')}</Tag> : null}
          {row.compat ? <Tag tone="warning">{t('card.readonly')}</Tag> : null}
          <Tag tone="quiet">{row.transport === 'stdio' ? t('card.stdio') : t('card.http')}</Tag>
          {oauth ? <Tag tone="info">{t('card.oauth')}</Tag> : null}
          {row.toolLoading === 'on-demand' ? <Tag tone="neutral">{t('editor.onDemand')}</Tag> : null}
          {row.disabledTools.length > 0
            ? <Tag tone="warning">{t('card.disabledTools', { count: row.disabledTools.length })}</Tag>
            : null}
        </span>
        <span className={cx('dsh-mcp-head-end')}>
          <span className={cx('dsh-mcp-status')} data-tone={status.tone}>
            <StateDot state={status.tone} size={8} />
            {status.label}
          </span>
          <Switch
            checked={row.enabled}
            disabled={busy || !canEdit}
            label={t(row.enabled ? 'action.disable' : 'action.enable')}
            title={canEdit ? undefined : t('card.readonly')}
            onChange={next => { props.onToggle(row, next) }}
          />
        </span>
      </div>

      <div className={cx('dsh-mcp-meta')}>
        {row.transport === 'stdio'
          ? (
            <>
              <span>{t('card.command')}</span>
              <code>{row.command === '' ? '—' : row.command}</code>
              {row.args.length > 0 ? <code>{row.args.join(' ')}</code> : null}
              {row.cwd !== '' ? <span title={row.cwd}>{t('card.cwd')}: <code>{row.cwd}</code></span> : null}
            </>
          )
          : (
            <>
              <span>{t('card.url')}</span>
              <code>{row.url === '' ? '—' : row.url}</code>
            </>
          )}
        {row.kind === 'file' && row.path !== undefined ? (
          <span title={row.path}>{t('card.path')}: <code>{row.path}</code></span>
        ) : null}
      </div>

      {status.detail !== undefined ? <div className={cx('dsh-mcp-detail')}>{status.detail}</div> : null}
      {registrationNote !== undefined
        ? <div className={cx('dsh-mcp-inline-note')} data-tone={row.registration?.state === 'conflict' ? 'error' : undefined}>{registrationNote}</div>
        : null}
      {row.shadowed.length > 0
        ? <div className={cx('dsh-mcp-inline-note')}>{t('card.shadowed', { scopes: row.shadowed.map(scope => scopeLabel(scope, t)).join(', ') })}</div>
        : null}
      {row.conflict
        ? <div className={cx('dsh-mcp-inline-note')} data-tone="error">{t('registration.conflict')}</div>
        : null}
      {row.kind === 'entry' ? <p className={cx('dsh-mcp-note')}>{t('card.entryHint')}</p> : null}

      <div className={cx('dsh-mcp-actions')}>
        <Button variant="ghost" size="sm" icon={<IconRefreshOutlineRegular size={14} />} disabled={busy} onClick={() => { props.onRestart(row) }}>
          {t('action.restart')}
        </Button>
        <Button variant="ghost" size="sm" icon={<IconPlayOutlineRegular size={14} />} disabled={busy} onClick={() => { props.onProbe(row) }}>
          {t('action.probe')}
        </Button>
        {oauth && authorizationPending
          ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => { props.onAuthorize(row) }}>
              {t('action.authorize')}
            </Button>
          )
          : null}
        {oauth && row.runtime?.status.state === 'connected'
          ? (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => { props.onSignOut(row) }}>
              {t('action.signOut')}
            </Button>
          )
          : null}
        <span className={cx('dsh-mcp-actions-end')}>
          <Button variant="ghost" size="sm" icon={<IconCopyOutlineRegular size={14} />} disabled={busy} onClick={() => { props.onCopy(row) }}>
            {t('copyJson')}
          </Button>
          {canEdit
            ? (
              <Button variant="ghost" size="sm" icon={<IconEditOutlineRegular size={14} />} disabled={busy} onClick={() => { props.onEdit(row) }}>
                {t('edit')}
              </Button>
            )
            : null}
          {canEdit
            ? (
              <Button variant="ghost" size="sm" icon={<IconCloseOutlineRegular size={14} />} disabled={busy} onClick={() => { props.onDelete(row) }}>
                {t('delete')}
              </Button>
            )
            : null}
        </span>
      </div>

      {row.tools.length > 0
        ? (
          <details className={cx('dsh-mcp-tools')}>
            <summary>{t('card.tools')} · {t('card.toolCount', { count: row.tools.length })}</summary>
            <div className={cx('dsh-mcp-tools-body')}>
              {row.toolLoading === 'on-demand' ? <p className={cx('dsh-mcp-note')}>{t('card.onDemand')}</p> : null}
              {row.tools.length > 6
                ? (
                  <div className={cx('dsh-mcp-tools-search')}>
                    <Input type="search" value={toolFilter} placeholder={t('tool.search')} aria-label={t('tool.search')}
                      onChange={(event) => { setToolFilter(event.target.value) }} />
                  </div>
                )
                : null}
              <div className={cx('dsh-mcp-tool-list')}>
                {tools.map(tool => (
                  <div key={tool.name} className={cx('dsh-mcp-tool')}>
                    <div className={cx('dsh-mcp-tool-main')}>
                      <div className={cx('dsh-mcp-tool-name')}>{tool.name}</div>
                      {tool.description !== '' ? <div className={cx('dsh-mcp-tool-desc')}>{tool.description}</div> : null}
                    </div>
                    <div className={cx('dsh-mcp-tool-toggle')}>
                      <Switch checked={tool.enabled} disabled={busy} label={t(tool.enabled ? 'tool.disable' : 'tool.enable')}
                        onChange={next => { props.onToolToggle(row, tool.name, next) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )
        : (
          <details className={cx('dsh-mcp-tools')}>
            <summary>{t('card.tools')}</summary>
            <div className={cx('dsh-mcp-tools-body')}>
              <p className={cx('dsh-mcp-note')}>{t('card.noTools')}</p>
              {row.toolLoading === 'on-demand' ? <p className={cx('dsh-mcp-note')}>{t('card.onDemand')}</p> : null}
            </div>
          </details>
        )}
    </article>
  )
}

function scopeLabel(scope: ServerSummary['scope'], t: (key: McpLocaleKey) => string): string {
  switch (scope) {
    case 'project': return t('scope.project')
    case 'profile': return t('scope.profile')
    case 'user': return t('scope.user')
    default: return t('scope.entry')
  }
}

function registrationText(row: ServerSummary, t: (key: McpLocaleKey, params?: Record<string, unknown>) => string): string | undefined {
  const registration = row.registration
  if (registration === undefined) return undefined
  switch (registration.state) {
    case 'missing-env': return t('registration.missingEnv', { names: (registration.missing ?? []).join(', ') })
    case 'invalid': return t('registration.invalid', { error: registration.error ?? '' })
    case 'conflict': return t('registration.conflict')
    case 'error': return t('registration.error', { error: registration.error ?? '' })
    default: return undefined
  }
}
