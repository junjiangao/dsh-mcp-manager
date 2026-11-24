/** Settings → MCP: one page over the official entries and every file scope. */

import { useMemo, useState, useSyncExternalStore } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button, IconPlusOutlineRegular, IconRefreshOutlineRegular, Input, Modal, RiskConfirmation, SegmentedControl, StateDot, Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { McpScope } from '../types.ts'
import type { ManagerStore } from './manager-store.ts'
import type { McpLocaleKey } from './locales.ts'
import { createDraft, entryFromDraft, patchFromDraft, scopeOf, type DraftTarget, type ServerDraft } from './draft.ts'
import { buildSummaries, filterSummaries, rowToJson, type ServerSummary, type SourceFilter, type StatusFilter } from './summary.ts'
import { countStatuses } from './status.ts'
import { copyText, cx, PANEL_CSS } from './panel-css.ts'
import { ServerCard } from './ServerCard.tsx'
import { ServerEditor } from './ServerEditor.tsx'
import { ProbeDialog } from './ProbeDialog.tsx'
import { OAuthDialog } from './OAuthDialog.tsx'

/** What the section registration injects. */
export interface McpSectionInjected {
  readonly store: ManagerStore
}

export type McpSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.mcpManager'>
  & InjectFace<McpSectionInjected>

interface EditorState {
  readonly row?: ServerSummary
  readonly draft: ServerDraft
}

export function McpSection(props: McpSectionProps) {
  const { t } = props
  const store = props.store
  const state = useSyncExternalStore(store.state.subscribe, store.state.getSnapshot)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<SourceFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [editor, setEditor] = useState<EditorState | undefined>(undefined)
  const [probe, setProbe] = useState<string | undefined>(undefined)
  const [oauth, setOauth] = useState<string | undefined>(undefined)
  const [deleting, setDeleting] = useState<ServerSummary | undefined>(undefined)
  const [acknowledged, setAcknowledged] = useState(false)

  const entryServers = state.upstream.value?.servers ?? {}
  const disabledTools = state.own.value?.disabledTools ?? {}
  const entryWritable = state.upstream.status === 'ready' && state.upstream.writable
  const all = useMemo(
    () => buildSummaries(state.snapshot, state.managed, entryServers, disabledTools, entryWritable),
    [state.snapshot, state.managed, entryServers, disabledTools, entryWritable],
  )
  const rows = useMemo(() => filterSummaries(all, search, source, status), [all, search, source, status])
  const counts = useMemo(() => countStatuses(all.map(row => row.runtime)), [all])
  const workspaces = state.snapshot?.workspaces ?? []
  const sources = state.snapshot?.sources ?? []
  const busy = state.busy
  const oauthName = oauth
  const oauthRow = oauthName === undefined ? undefined : all.find(row => row.name === oauthName)
  const deleteOpen = deleting !== undefined

  const beginDelete = (row: ServerSummary): void => {
    setAcknowledged(false)
    setDeleting(row)
  }

  const confirmDelete = (): void => {
    if (deleting === undefined) return
    void store.removeServer(deleting)
    setDeleting(undefined)
    setAcknowledged(false)
  }

  const saveEditor = (draft: ServerDraft): void => {
    const current = editor
    if (current === undefined) return
    const original = current.row
    const write = draft.target === 'entry'
      ? store.saveEntry(draft.name, entryFromDraft(draft))
      : store.upsertServer({ scope: scopeOf(draft.target) as McpScope, server: patchFromDraft(draft) })
    void write.then((accepted) => {
      if (!accepted) return
      if (original !== undefined && original.name !== draft.name) {
        if (original.kind === 'entry') void store.removeEntry(original.name)
        else void store.removeServer(original)
      }
      setEditor(undefined)
    })
  }

  const openEditor = (row: ServerSummary | undefined): void => {
    const defaultTarget: DraftTarget = entryWritable ? 'entry' : 'profile'
    setEditor({ ...row === undefined ? {} : { row }, draft: createDraft(row, defaultTarget) })
  }

  return (
    <section className={cx('dsh-mcp')} aria-labelledby="dsh-mcp-title">
      <style>{PANEL_CSS}</style>
      <header className={cx('dsh-mcp-hero')}>
        <div>
          <h2 id="dsh-mcp-title">{t('title')}</h2>
          <p>{t('subtitle')}</p>
        </div>
        <div className={cx('dsh-mcp-hero-actions')}>
          <Button variant="outline" size="sm" icon={<IconRefreshOutlineRegular size={14} />} disabled={busy}
            onClick={() => { store.refresh() }}>
            {busy ? t('refreshing') : t('refresh')}
          </Button>
          <Button variant="primary" size="sm" icon={<IconPlusOutlineRegular size={14} />} onClick={() => { openEditor(undefined) }}>
            {t('add')}
          </Button>
        </div>
      </header>

      {state.streamFailed ? (
        <div className={cx('dsh-mcp-banner')} data-tone="warning" role="status">
          <span className={cx('dsh-mcp-banner-text')}>{t('error.stream')}</span>
        </div>
      ) : null}
      {state.pollFailed ? (
        <div className={cx('dsh-mcp-banner')} data-tone="warning" role="status">
          <span className={cx('dsh-mcp-banner-text')}>{t('error.snapshot', { message: state.error ?? '' })}</span>
        </div>
      ) : null}
      {state.upstream.status === 'unavailable' ? (
        <div className={cx('dsh-mcp-banner')} data-tone="warning">
          <span className={cx('dsh-mcp-banner-text')}>{t('error.upstream')}</span>
        </div>
      ) : null}
      {state.notice !== undefined ? (
        <div className={cx('dsh-mcp-banner')} data-tone={state.notice.tone === 'error' ? 'error' : 'success'} role={state.notice.tone === 'error' ? 'alert' : 'status'}>
          <span className={cx('dsh-mcp-banner-text')}>{state.notice.text}</span>
          <span className={cx('dsh-mcp-banner-close')}>
            <Button variant="ghost" size="sm" onClick={() => { store.clearNotice() }}>{t('close')}</Button>
          </span>
        </div>
      ) : null}

      <div className={cx('dsh-mcp-toolbar')}>
        <div className={cx('dsh-mcp-search')}>
          <Input type="search" value={search} placeholder={t('filter.searchPlaceholder')} aria-label={t('filter.search')}
            onChange={(event) => { setSearch(event.target.value) }} />
        </div>
        <SegmentedControl id="dsh-mcp-source" label={t('filter.source')} value={source}
          options={[
            { value: 'all', label: t('filter.all') },
            { value: 'entry', label: t('source.entry') },
            { value: 'file', label: t('source.file') },
          ]}
          onChange={next => { setSource(next) }} />
        <SegmentedControl id="dsh-mcp-status" label={t('filter.status')} value={status}
          options={[
            { value: 'all', label: t('filter.all') },
            { value: 'connected', label: t('status.connected') },
            { value: 'busy', label: t('status.connecting') },
            { value: 'attention', label: t('filter.attention') },
            { value: 'disabled', label: t('status.disabled') },
          ]}
          onChange={next => { setStatus(next) }} />
        {workspaces.length > 0 ? (
          <label className={cx('dsh-mcp-project')}>
            <span>{t('scope.project')}</span>
            <select value={state.projectPath ?? ''} disabled={busy}
              onChange={(event) => { store.selectProject(event.target.value === '' ? undefined : event.target.value) }}>
              <option value="">{t('none')}</option>
              {workspaces.map(workspace => (
                <option key={workspace.path} value={workspace.path}>{workspace.title ?? workspace.path}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className={cx('dsh-mcp-summary')}>
        <span className={cx('dsh-mcp-summary-chip')}><StateDot state={counts.connected > 0 ? 'done' : 'idle'} size={8} />{t('summary.connected', { count: counts.connected })}</span>
        <span className={cx('dsh-mcp-summary-chip')}><StateDot state={counts.busy > 0 ? 'ongoing' : 'idle'} size={8} />{t('summary.busy', { count: counts.busy })}</span>
        <span className={cx('dsh-mcp-summary-chip')}><StateDot state={counts.attention > 0 ? 'warning' : 'idle'} size={8} />{t('summary.attention', { count: counts.attention })}</span>
        <span className={cx('dsh-mcp-summary-chip')}><StateDot state="idle" size={8} />{t('summary.disabled', { count: counts.disabled })}</span>
        <span className={cx('dsh-mcp-summary-total')}>{t('count', { count: counts.total })}</span>
      </div>

      {state.status === 'error' ? (
        <div className={cx('dsh-mcp-empty')}>
          <strong>{t('error.snapshot', { message: state.error ?? '' })}</strong>
          <Button variant="outline" onClick={() => { store.refresh() }}>{t('retry')}</Button>
        </div>
      ) : null}

      {state.status === 'loading' ? <div className={cx('dsh-mcp-loading')}>{t('loading.servers')}</div> : null}

      {state.status === 'ready' && rows.length === 0 ? (
        <div className={cx('dsh-mcp-empty')}>
          <strong>{t('empty.title')}</strong>
          <span>{all.length === 0 ? t('empty.description') : t('filter.search')}</span>
          <Button variant="primary" size="sm" icon={<IconPlusOutlineRegular size={14} />} onClick={() => { openEditor(undefined) }}>
            {all.length === 0 ? t('empty.action') : t('add')}
          </Button>
        </div>
      ) : null}

      <div className={cx('dsh-mcp-list')}>
        {rows.map(row => (
          <ServerCard
            key={`${row.kind}:${row.name}`}
            row={row}
            t={t}
            busy={busy}
            onToggle={(target, enabled) => { void store.setEnabled(target, enabled) }}
            onEdit={target => { openEditor(target) }}
            onDelete={beginDelete}
            onRestart={target => { void store.restart(target.name) }}
            onProbe={target => { setProbe(target.name) }}
            onAuthorize={target => { setOauth(target.name) }}
            onSignOut={target => { void store.signOut(target.name) }}
            onToolToggle={(target, tool, enabled) => { void store.setToolEnabled(target.name, tool, enabled) }}
            onCopy={target => {
              void copyText(rowToJson(target)).then((copied) => { store.notify(t(copied ? 'notice.copied' : 'notice.copyFailed'), copied ? 'success' : 'error') })
            }}
          />
        ))}
      </div>

      {sources.length > 0 ? (
        <details className={cx('dsh-mcp-sources')}>
          <summary>{t('sources.title')}</summary>
          <div className={cx('dsh-mcp-sources-body')}>
            <p className={cx('dsh-mcp-note')}>{t('sources.hint')}</p>
            {sources.map(file => (
              <div key={`${file.scope}:${file.path}`} className={cx('dsh-mcp-source-row')}>
                <Tag tone={file.compat ? 'warning' : 'outline'}>{scopeLabel(file.scope, t)}</Tag>
                <code>{file.path}</code>
                <span className={cx('dsh-mcp-tag-note')}>
                  {file.exists ? (file.writable ? t('sources.writable') : t('sources.readonly')) : t('sources.missing')}
                  {' · '}
                  {t('sources.count', { count: file.serverCount })}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <p className={cx('dsh-mcp-note')}>{t('panel.toolsNote')}</p>

      {editor !== undefined ? (
        <Modal open onClose={() => { setEditor(undefined) }} closeLabel={t('close')}
          title={editor.row === undefined ? t('editor.new') : t('editor.edit', { name: editor.row.name })}>
          <ServerEditor
            key={`${editor.row?.kind ?? 'new'}:${editor.row?.name ?? 'new'}`}
            row={editor.row}
            draft={editor.draft}
            busy={busy}
            entryWritable={entryWritable}
            hasWorkspace={workspaces.length > 0}
            hasProjectSelection={state.projectPath !== undefined}
            t={t}
            onClose={() => { setEditor(undefined) }}
            onSave={saveEditor}
          />
        </Modal>
      ) : null}

      {probe !== undefined ? (
        <ProbeDialog key={probe} name={probe} t={t} onClose={() => { setProbe(undefined) }} run={name => store.probe(name)} />
      ) : null}

      {oauthName !== undefined ? (
        <OAuthDialog key={oauthName} name={oauthName} t={t} connected={oauthRow?.runtime?.status.state === 'connected'}
          onClose={() => { setOauth(undefined) }}
          start={() => store.authorize(oauthName)}
          cancel={id => store.cancelAuthorization(oauthName, id)}
          signOut={() => store.signOut(oauthName)} />
      ) : null}

      <RiskConfirmation
        open={deleteOpen}
        title={t('confirm.deleteTitle')}
        description={deleting === undefined ? '' : t('confirm.deleteDescription', { name: deleting.name })}
        acknowledgeLabel={t('confirm.acknowledge')}
        cancelLabel={t('confirm.cancel')}
        closeLabel={t('close')}
        confirmLabel={t('confirm.delete')}
        acknowledged={acknowledged}
        disabled={busy}
        onAcknowledgedChange={setAcknowledged}
        onCancel={() => { setDeleting(undefined) }}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function scopeLabel(scope: McpScope, t: (key: McpLocaleKey) => string): string {
  switch (scope) {
    case 'project': return t('scope.project')
    case 'profile': return t('scope.profile')
    case 'user': return t('scope.user')
  }
}
