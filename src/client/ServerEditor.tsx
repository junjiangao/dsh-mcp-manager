/** The create/edit dialog for one MCP server, whichever store it lives in. */

import { useMemo, useState } from 'react'
import {
  Button, Checkbox, IconCloseOutlineRegular, IconPlusOutlineRegular, Input, SegmentedControl,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { McpLocaleKey } from './locales.ts'
import { cx } from './panel-css.ts'
import { issueKey, validateDraft, type DraftIssue, type DraftRow, type DraftTarget, type ServerDraft } from './draft.ts'
import type { ServerSummary } from './summary.ts'

export interface ServerEditorProps {
  /** The server being edited, or `undefined` when creating one. */
  readonly row: ServerSummary | undefined
  readonly draft: ServerDraft
  readonly busy: boolean
  readonly entryWritable: boolean
  readonly hasWorkspace: boolean
  readonly hasProjectSelection: boolean
  readonly t: (key: McpLocaleKey, params?: Record<string, unknown>) => string
  readonly onClose: () => void
  readonly onSave: (draft: ServerDraft) => void
}

export function ServerEditor(props: ServerEditorProps) {
  const { t, row } = props
  const [draft, setDraft] = useState<ServerDraft>(props.draft)
  const [issues, setIssues] = useState<readonly DraftIssue[]>([])
  const editing = row !== undefined
  const isFile = draft.target !== 'entry'
  const patch = (fields: Partial<ServerDraft>): void => { setDraft(current => ({ ...current, ...fields })) }
  const targetOptions = useMemo(() => ([
    { value: 'entry' as DraftTarget, label: t('editor.targetEntry'), disabled: !props.entryWritable, title: props.entryWritable ? undefined : t('editor.noEntryWrite') },
    { value: 'project' as DraftTarget, label: t('editor.targetProject'), disabled: !props.hasWorkspace || !props.hasProjectSelection, title: props.hasWorkspace ? undefined : t('editor.noWorkspace') },
    { value: 'profile' as DraftTarget, label: t('editor.targetProfile') },
    { value: 'user' as DraftTarget, label: t('editor.targetUser') },
  ]), [props.entryWritable, props.hasWorkspace, props.hasProjectSelection, t])

  const submit = (): void => {
    const found = validateDraft(draft)
    setIssues(found)
    if (found.length > 0) return
    props.onSave(draft)
  }

  return (
    <div>
      <div className={cx('dsh-mcp-editor')}>
        <label className={cx('dsh-mcp-field')}>
          <span className={cx('dsh-mcp-field-label')}>{t('editor.target')}</span>
          <select className={cx('dsh-mcp-target')} value={draft.target} disabled={props.busy || (editing && draft.target === 'entry' && !props.entryWritable)}
            onChange={(event) => { patch({ target: event.target.value as DraftTarget }) }}>
            {targetOptions.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled} title={option.title}>{option.label}</option>
            ))}
          </select>
          <span className={cx('dsh-mcp-field-hint')}>{draft.target === 'entry' ? t('editor.targetHintEntry') : t('editor.targetHintFile')}</span>
          {!props.hasWorkspace
            ? <span className={cx('dsh-mcp-field-hint')}>{t('editor.noWorkspace')}</span>
            : !props.hasProjectSelection ? <span className={cx('dsh-mcp-field-hint')}>{t('editor.noProject')}</span> : null}
          {!props.entryWritable ? <span className={cx('dsh-mcp-field-hint')}>{t('editor.noEntryWrite')}</span> : null}
        </label>

        <div className={cx('dsh-mcp-grid')}>
          <label className={cx('dsh-mcp-field')}>
            <span className={cx('dsh-mcp-field-label')}>{t('editor.name')}</span>
            <Input value={draft.name} placeholder="codebase-memory" spellCheck={false} disabled={props.busy}
              aria-invalid={issues.includes('name')}
              onChange={(event) => { patch({ name: event.target.value }) }} />
            <span className={cx('dsh-mcp-field-hint')}>{t('editor.nameHint')}</span>
          </label>
          <div className={cx('dsh-mcp-field')}>
            <span className={cx('dsh-mcp-field-label')}>{t('editor.transport')}</span>
            <SegmentedControl id="dsh-mcp-transport" label={t('editor.transport')} value={draft.transport}
              options={[
                { value: 'stdio', label: t('card.stdio') },
                { value: 'streamable-http', label: t('card.http') },
              ]}
              onChange={(transport) => { patch({ transport: transport as ServerDraft['transport'] }) }} disabled={props.busy} />
          </div>
        </div>

        {draft.transport === 'stdio'
          ? (
            <>
              <label className={cx('dsh-mcp-field')}>
                <span className={cx('dsh-mcp-field-label')}>{t('editor.command')}</span>
                <Input value={draft.command} placeholder="npx" spellCheck={false} disabled={props.busy}
                  aria-invalid={issues.includes('command')}
                  onChange={(event) => { patch({ command: event.target.value }) }} />
              </label>
              <div className={cx('dsh-mcp-field')}>
                <span className={cx('dsh-mcp-field-label')}>{t('editor.args')}</span>
                <div className={cx('dsh-mcp-rows')}>
                  {draft.args.map((arg, index) => (
                    <div key={index} className={cx('dsh-mcp-row')}>
                      <Input value={arg} spellCheck={false} disabled={props.busy} aria-label={`${t('editor.args')} ${String(index + 1)}`}
                        onChange={(event) => {
                          const args = [...draft.args]
                          args[index] = event.target.value
                          patch({ args })
                        }} />
                      <Button variant="ghost" size="sm" className={cx('dsh-mcp-row-remove')} icon={<IconCloseOutlineRegular size={13} />}
                        aria-label={t('editor.removeArg')} disabled={props.busy}
                        onClick={() => { patch({ args: draft.args.filter((_, position) => position !== index) }) }} />
                    </div>
                  ))}
                </div>
                <div>
                  <Button variant="outline" size="sm" icon={<IconPlusOutlineRegular size={13} />} disabled={props.busy}
                    onClick={() => { patch({ args: [...draft.args, ''] }) }}>
                    {t('editor.addArg')}
                  </Button>
                </div>
              </div>
              <label className={cx('dsh-mcp-field')}>
                <span className={cx('dsh-mcp-field-label')}>{t('editor.cwd')}</span>
                <Input value={draft.cwd} placeholder="/home/user/project" spellCheck={false} disabled={props.busy}
                  onChange={(event) => { patch({ cwd: event.target.value }) }} />
              </label>
              <MapRows
                label={t('editor.env')} rows={draft.env} busy={props.busy} fileTarget={isFile} t={t}
                onChange={(env) => { patch({ env }) }} />
            </>
          )
          : (
            <>
              <label className={cx('dsh-mcp-field')}>
                <span className={cx('dsh-mcp-field-label')}>{t('editor.url')}</span>
                <Input value={draft.url} placeholder="https://mcp.example.com/mcp" spellCheck={false} disabled={props.busy}
                  aria-invalid={issues.includes('url')}
                  onChange={(event) => { patch({ url: event.target.value }) }} />
              </label>
              <MapRows
                label={t('editor.headers')} rows={draft.headers} busy={props.busy} fileTarget={isFile} t={t}
                onChange={(headers) => { patch({ headers }) }} />
              <div className={cx('dsh-mcp-field')}>
                <Checkbox checked={draft.oauthEnabled} label={t('editor.oauth')} disabled={props.busy}
                  onChange={(oauthEnabled) => { patch({ oauthEnabled }) }} />
                <span className={cx('dsh-mcp-field-hint')}>{t('editor.oauthHint')}</span>
              </div>
              {draft.oauthEnabled ? (
                <div className={cx('dsh-mcp-grid')}>
                  <label className={cx('dsh-mcp-field')}>
                    <span className={cx('dsh-mcp-field-label')}>{t('editor.credentialKey')}</span>
                    <Input value={draft.oauthCredentialKey} placeholder="mcp-client/example" spellCheck={false} disabled={props.busy}
                      aria-invalid={issues.includes('oauthKey')}
                      onChange={(event) => { patch({ oauthCredentialKey: event.target.value }) }} />
                  </label>
                  <label className={cx('dsh-mcp-field')}>
                    <span className={cx('dsh-mcp-field-label')}>{t('editor.clientId')}</span>
                    <Input value={draft.oauthClientId} spellCheck={false} disabled={props.busy}
                      onChange={(event) => { patch({ oauthClientId: event.target.value }) }} />
                  </label>
                  <label className={cx('dsh-mcp-field')}>
                    <span className={cx('dsh-mcp-field-label')}>{t('editor.scope')}</span>
                    <Input value={draft.oauthScope} spellCheck={false} disabled={props.busy}
                      onChange={(event) => { patch({ oauthScope: event.target.value }) }} />
                  </label>
                  <label className={cx('dsh-mcp-field')}>
                    <span className={cx('dsh-mcp-field-label')}>{t('editor.requestTimeout')}</span>
                    <Input value={draft.oauthRequestTimeout} inputMode="numeric" disabled={props.busy}
                      onChange={(event) => { patch({ oauthRequestTimeout: event.target.value }) }} />
                  </label>
                  <label className={cx('dsh-mcp-field')}>
                    <span className={cx('dsh-mcp-field-label')}>{t('editor.authorizationTimeout')}</span>
                    <Input value={draft.oauthAuthorizationTimeout} inputMode="numeric" disabled={props.busy}
                      onChange={(event) => { patch({ oauthAuthorizationTimeout: event.target.value }) }} />
                  </label>
                </div>
              ) : null}
            </>
          )}

        <details className={cx('dsh-mcp-tools')}>
          <summary>{t('editor.advanced')}</summary>
          <div className={cx('dsh-mcp-tools-body')}>
            <div className={cx('dsh-mcp-grid')}>
              <label className={cx('dsh-mcp-field')}>
                <span className={cx('dsh-mcp-field-label')}>{t('editor.startupTimeout')}</span>
                <Input value={draft.startupTimeoutMs} inputMode="numeric" disabled={props.busy}
                  onChange={(event) => { patch({ startupTimeoutMs: event.target.value }) }} />
              </label>
              <label className={cx('dsh-mcp-field')}>
                <span className={cx('dsh-mcp-field-label')}>{t('editor.closeTimeout')}</span>
                <Input value={draft.closeTimeoutMs} inputMode="numeric" disabled={props.busy}
                  onChange={(event) => { patch({ closeTimeoutMs: event.target.value }) }} />
              </label>
              <label className={cx('dsh-mcp-field')}>
                <span className={cx('dsh-mcp-field-label')}>{t('editor.toolCallTimeout')}</span>
                <Input value={draft.toolCallTimeoutMs} inputMode="numeric" disabled={props.busy}
                  onChange={(event) => { patch({ toolCallTimeoutMs: event.target.value }) }} />
              </label>
              <div className={cx('dsh-mcp-field')}>
                <span className={cx('dsh-mcp-field-label')}>{t('editor.toolLoading')}</span>
                <SegmentedControl id="dsh-mcp-tool-loading" label={t('editor.toolLoading')} value={draft.toolLoading}
                  options={[
                    { value: 'eager', label: t('editor.eager') },
                    { value: 'on-demand', label: t('editor.onDemand') },
                  ]}
                  onChange={(toolLoading) => { patch({ toolLoading: toolLoading as ServerDraft['toolLoading'] }) }} disabled={props.busy} />
                {draft.toolLoading === 'on-demand' ? <span className={cx('dsh-mcp-field-hint')}>{t('editor.onDemandHint')}</span> : null}
              </div>
            </div>
            <div className={cx('dsh-mcp-field')}>
              <Checkbox checked={draft.reconnectEnabled} label={t('editor.reconnectEnabled')} disabled={props.busy}
                onChange={(reconnectEnabled) => { patch({ reconnectEnabled }) }} />
            </div>
            {draft.reconnectEnabled ? (
              <div className={cx('dsh-mcp-grid')}>
                <label className={cx('dsh-mcp-field')}>
                  <span className={cx('dsh-mcp-field-label')}>{t('editor.initialDelay')}</span>
                  <Input value={draft.reconnectInitial} inputMode="numeric" disabled={props.busy}
                    onChange={(event) => { patch({ reconnectInitial: event.target.value }) }} />
                </label>
                <label className={cx('dsh-mcp-field')}>
                  <span className={cx('dsh-mcp-field-label')}>{t('editor.maxDelay')}</span>
                  <Input value={draft.reconnectMax} inputMode="numeric" disabled={props.busy}
                    onChange={(event) => { patch({ reconnectMax: event.target.value }) }} />
                </label>
                <label className={cx('dsh-mcp-field')}>
                  <span className={cx('dsh-mcp-field-label')}>{t('editor.maxAttempts')}</span>
                  <Input value={draft.reconnectAttempts} inputMode="numeric" disabled={props.busy}
                    onChange={(event) => { patch({ reconnectAttempts: event.target.value }) }} />
                </label>
              </div>
            ) : null}
          </div>
        </details>

        {issues.length > 0
          ? (
            <div className={cx('dsh-mcp-banner')} data-tone="error" role="alert">
              <span className={cx('dsh-mcp-banner-text')}>{issues.map(issue => t(issueKey(issue) as McpLocaleKey)).join(' · ')}</span>
            </div>
          )
          : null}
      </div>

      <div className={cx('dsh-mcp-footer')} style={{ marginTop: '16px' }}>
        <Button variant="outline" onClick={props.onClose} disabled={props.busy}>{t('cancel')}</Button>
        <Button variant="primary" onClick={submit} disabled={props.busy}>{props.busy ? t('saving') : t('save')}</Button>
      </div>
    </div>
  )
}

interface MapRowsProps {
  readonly label: string
  readonly rows: readonly DraftRow[]
  readonly busy: boolean
  readonly fileTarget: boolean
  readonly t: ServerEditorProps['t']
  readonly onChange: (rows: DraftRow[]) => void
}

function MapRows(props: MapRowsProps) {
  const { t } = props
  return (
    <div className={cx('dsh-mcp-field')}>
      <span className={cx('dsh-mcp-field-label')}>{props.label}</span>
      <div className={cx('dsh-mcp-rows')}>
        {props.rows.map((row, index) => (
          <div key={index} className={cx('dsh-mcp-row')}>
            <Input className={cx('dsh-mcp-row-key')} value={row.key} placeholder={t('editor.keyPlaceholder')} spellCheck={false}
              title={row.key}
              disabled={props.busy} aria-label={`${props.label} ${t('editor.keyPlaceholder')} ${String(index + 1)}`}
              onChange={(event) => {
                const rows = props.rows.map((entry, position) => position === index ? { ...entry, key: event.target.value } : entry)
                props.onChange(rows)
              }} />
            <Input className={cx('dsh-mcp-row-value')} value={row.value} placeholder={row.configured ? t('editor.secretKept') : t('editor.valuePlaceholder')} spellCheck={false}
              disabled={props.busy} aria-label={`${props.label} ${t('editor.valuePlaceholder')} ${String(index + 1)}`}
              onChange={(event) => {
                const rows = props.rows.map((entry, position) => position === index ? { ...entry, value: event.target.value } : entry)
                props.onChange(rows)
              }} />
            {props.fileTarget
              ? (
                <span className={cx('dsh-mcp-row-flag')}>
                  <Checkbox checked={row.secret} label={t('editor.secret')} disabled={props.busy}
                    onChange={(secret) => {
                      const rows = props.rows.map((entry, position) => position === index ? { ...entry, secret } : entry)
                      props.onChange(rows)
                    }} />
                </span>
              )
              : null}
            <Button variant="ghost" size="sm" className={cx('dsh-mcp-row-remove')} icon={<IconCloseOutlineRegular size={13} />}
              aria-label={t('editor.removeRow')} disabled={props.busy}
              onClick={() => { props.onChange(props.rows.filter((_, position) => position !== index)) }} />
          </div>
        ))}
      </div>
      {props.fileTarget && props.rows.some(row => row.configured)
        ? <span className={cx('dsh-mcp-field-hint')}>{t('editor.secretHint')}</span>
        : null}
      <div>
        <Button variant="outline" size="sm" icon={<IconPlusOutlineRegular size={13} />} disabled={props.busy}
          onClick={() => { props.onChange([...props.rows, { key: '', value: '', secret: false, configured: false }]) }}>
          {t('editor.addRow')}
        </Button>
      </div>
    </div>
  )
}
