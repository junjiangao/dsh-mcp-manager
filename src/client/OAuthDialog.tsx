/** The OAuth dialog: the Host starts the attempt; the browser only opens the page and cancels. */

import { useEffect, useRef, useState } from 'react'
import { Button, IconLinkOutlineRegular, Modal, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { AuthorizationResult } from '../types.ts'
import type { McpLocaleKey } from './locales.ts'
import { cx } from './panel-css.ts'

export interface OAuthDialogProps {
  readonly name: string
  readonly connected: boolean
  readonly t: (key: McpLocaleKey, params?: Record<string, unknown>) => string
  readonly onClose: () => void
  readonly start: () => Promise<AuthorizationResult | undefined>
  readonly cancel: (id: string) => Promise<boolean>
  readonly signOut: () => Promise<boolean>
}

const PHASE_KEYS: Record<AuthorizationResult['phase'], McpLocaleKey> = {
  starting: 'oauth.starting',
  'waiting-browser': 'oauth.waitingBrowser',
  exchanging: 'oauth.exchanging',
  committing: 'oauth.committing',
  authorized: 'oauth.authorized',
  cancelled: 'oauth.cancelled',
  failed: 'oauth.failed',
}

export function OAuthDialog(props: OAuthDialogProps) {
  const { t, name } = props
  const [attempt, setAttempt] = useState<AuthorizationResult | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const live = useRef(true)

  const start = (): void => {
    setBusy(true)
    setError(undefined)
    void props.start().then((result) => {
      if (!live.current) return
      setAttempt(result)
      if (result === undefined) setError(t('oauth.startFailed', { message: '' }))
    }).finally(() => {
      if (live.current) setBusy(false)
    })
  }

  useEffect(() => {
    live.current = true
    start()
    return () => { live.current = false }
    // Started once per mount; the header's reauthorize action remounts the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cancel = (): void => {
    if (attempt === undefined) return
    setBusy(true)
    void props.cancel(attempt.id).then((accepted) => {
      if (live.current && accepted) setAttempt({ ...attempt, phase: 'cancelled' })
    }).finally(() => {
      if (live.current) setBusy(false)
    })
  }

  const final = attempt !== undefined && (attempt.phase === 'authorized' || attempt.phase === 'cancelled' || attempt.phase === 'failed')
  const waiting = attempt?.phase === 'waiting-browser'

  return (
    <Modal open onClose={props.onClose} title={t('oauth.title', { name })} closeLabel={t('close')}
      footer={(
        <>
          {props.connected
            ? <Button variant="outline" onClick={() => { void props.signOut() }} disabled={busy}>{t('oauth.signOut')}</Button>
            : null}
          {attempt !== undefined && !final
            ? <Button variant="outline" onClick={cancel} disabled={busy}>{t('oauth.cancel')}</Button>
            : null}
          <Button variant="primary" onClick={props.onClose} disabled={busy}>{t('oauth.done')}</Button>
        </>
      )}>
      <div className={cx('dsh-mcp-probe')}>
        {attempt !== undefined
          ? (
            <div className={cx('dsh-mcp-status')} data-tone={attempt.phase === 'authorized' ? 'done' : attempt.phase === 'failed' ? 'error' : 'ongoing'}>
              <StateDot state={attempt.phase === 'authorized' ? 'done' : attempt.phase === 'failed' ? 'error' : 'ongoing'} size={8} />
              {t(PHASE_KEYS[attempt.phase], { error: attempt.lastError ?? error ?? '' })}
            </div>
          )
          : <p>{busy ? t('oauth.starting') : t('oauth.startFailed', { message: error ?? '' })}</p>}
        {attempt?.lastError !== undefined ? <p className={cx('dsh-mcp-detail')}>{attempt.lastError}</p> : null}
        {error !== undefined && attempt === undefined ? <p className={cx('dsh-mcp-detail')}>{error}</p> : null}
        {waiting && attempt?.authorizationUrl !== undefined
          ? (
            <a className={cx('dsh-mcp-oauth-link')} href={attempt.authorizationUrl} target="_blank" rel="noopener noreferrer">
              <IconLinkOutlineRegular size={14} />{t('oauth.open')}
            </a>
          )
          : null}
        {!final ? <p className={cx('dsh-mcp-note')}>{t('oauth.hint')}</p> : null}
        {attempt === undefined ? <Button variant="outline" size="sm" onClick={start} disabled={busy}>{t('retry')}</Button> : null}
      </div>
    </Modal>
  )
}
