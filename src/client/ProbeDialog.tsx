/** The probe dialog: one throwaway connection that reports what the server advertises. */

import { useEffect, useRef, useState } from 'react'
import { Button, Modal, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { McpProbeResult } from '@deepseek-ai/dsh-mcp-client/types'
import type { McpLocaleKey } from './locales.ts'
import { cx } from './panel-css.ts'

export interface ProbeDialogProps {
  readonly name: string
  readonly t: (key: McpLocaleKey, params?: Record<string, unknown>) => string
  readonly onClose: () => void
  readonly run: (name: string) => Promise<{ readonly ok: true; readonly result: McpProbeResult } | { readonly ok: false; readonly message: string }>
}

type ProbeState =
  | { readonly phase: 'running' }
  | { readonly phase: 'result'; readonly result: McpProbeResult }
  | { readonly phase: 'rpc-failure'; readonly message: string }

export function ProbeDialog(props: ProbeDialogProps) {
  const { t, name } = props
  const [state, setState] = useState<ProbeState>({ phase: 'running' })
  const runId = useRef(0)

  const run = (): void => {
    const current = ++runId.current
    setState({ phase: 'running' })
    void props.run(name).then((outcome) => {
      if (runId.current !== current) return
      setState(outcome.ok ? { phase: 'result', result: outcome.result } : { phase: 'rpc-failure', message: outcome.message })
    }, (error: unknown) => {
      if (runId.current !== current) return
      setState({ phase: 'rpc-failure', message: error instanceof Error ? error.message : String(error) })
    })
  }

  useEffect(() => {
    run()
    return () => { runId.current += 1 }
    // The dialog is keyed by server name; a new name mounts a new dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  return (
    <Modal open onClose={props.onClose} title={t('probe.title', { name })} closeLabel={t('close')}
      footer={<Button variant="primary" onClick={props.onClose}>{t('probe.done')}</Button>}>
      <div className={cx('dsh-mcp-probe')}>
        {state.phase === 'running' ? <p>{t('probe.running')}</p> : null}
        {state.phase === 'result' && state.result.ok ? <ProbeSuccess result={state.result} t={t} /> : null}
        {state.phase === 'result' && !state.result.ok ? (
          <>
            <div className={cx('dsh-mcp-status')} data-tone="error"><StateDot state="error" size={8} />{t('probe.failure')}</div>
            <dl className={cx('dsh-mcp-kv')}>
              <dt>{t('probe.stage')}</dt>
              <dd>{state.result.stage === 'connect' ? t('probe.stageConnect') : t('probe.stageList')}</dd>
              <dt>{t('probe.duration')}</dt>
              <dd>{state.result.durationMs} ms</dd>
            </dl>
            <p className={cx('dsh-mcp-detail')}>{state.result.message}</p>
            <p className={cx('dsh-mcp-note')}>
              {state.result.closeConfirmed ? t('probe.closeConfirmed') : t('probe.cleanupError', { error: state.result.cleanupError ?? '' })}
            </p>
          </>
        ) : null}
        {state.phase === 'rpc-failure' ? (
          <>
            <div className={cx('dsh-mcp-status')} data-tone="error"><StateDot state="error" size={8} />{t('probe.failure')}</div>
            <p className={cx('dsh-mcp-detail')}>{state.message}</p>
          </>
        ) : null}
        <div>
          <Button variant="outline" size="sm" onClick={run}>{t('probe.again')}</Button>
        </div>
      </div>
    </Modal>
  )
}

function ProbeSuccess(props: { readonly result: Extract<McpProbeResult, { ok: true }>; readonly t: ProbeDialogProps['t'] }) {
  const { result, t } = props
  return (
    <>
      <div className={cx('dsh-mcp-status')} data-tone="done"><StateDot state="done" size={8} />{t('probe.success')}</div>
      <dl className={cx('dsh-mcp-kv')}>
        {result.serverInfo !== undefined
          ? (
            <>
              <dt>{t('probe.server')}</dt>
              <dd>{result.serverInfo.name} {result.serverInfo.version}</dd>
            </>
          )
          : null}
        <dt>{t('probe.duration')}</dt>
        <dd>{result.durationMs} ms</dd>
        <dt>{t('probe.tools')}</dt>
        <dd>{result.toolNames.length === 0 ? t('probe.empty') : String(result.toolNames.length)}</dd>
      </dl>
      {result.truncated ? <p className={cx('dsh-mcp-note')}>{t('probe.truncated')}</p> : null}
      <div className={cx('dsh-mcp-probe-list')}>
        {result.toolNames.map(tool => <div key={tool} className={cx('dsh-mcp-probe-item')}>{tool}</div>)}
      </div>
      <p className={cx('dsh-mcp-note')}>
        {result.closeConfirmed ? t('probe.closeConfirmed') : result.cleanupError === undefined ? null : t('probe.cleanupError', { error: result.cleanupError })}
      </p>
    </>
  )
}
