import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** The OAuth dialog: the Host starts the attempt; the browser only opens the page and cancels. */
import { useEffect, useRef, useState } from 'react';
import { Button, IconLinkOutlineRegular, Modal, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { cx } from "./panel-css.js";
const PHASE_KEYS = {
    starting: 'oauth.starting',
    'waiting-browser': 'oauth.waitingBrowser',
    exchanging: 'oauth.exchanging',
    committing: 'oauth.committing',
    authorized: 'oauth.authorized',
    cancelled: 'oauth.cancelled',
    failed: 'oauth.failed',
};
export function OAuthDialog(props) {
    const { t, name } = props;
    const [attempt, setAttempt] = useState(undefined);
    const [error, setError] = useState(undefined);
    const [busy, setBusy] = useState(false);
    const live = useRef(true);
    const start = () => {
        setBusy(true);
        setError(undefined);
        void props.start().then((result) => {
            if (!live.current)
                return;
            setAttempt(result);
            if (result === undefined)
                setError(t('oauth.startFailed', { message: '' }));
        }).finally(() => {
            if (live.current)
                setBusy(false);
        });
    };
    useEffect(() => {
        live.current = true;
        start();
        return () => { live.current = false; };
        // Started once per mount; the header's reauthorize action remounts the dialog.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const cancel = () => {
        if (attempt === undefined)
            return;
        setBusy(true);
        void props.cancel(attempt.id).then((accepted) => {
            if (live.current && accepted)
                setAttempt({ ...attempt, phase: 'cancelled' });
        }).finally(() => {
            if (live.current)
                setBusy(false);
        });
    };
    const final = attempt !== undefined && (attempt.phase === 'authorized' || attempt.phase === 'cancelled' || attempt.phase === 'failed');
    const waiting = attempt?.phase === 'waiting-browser';
    return (_jsx(Modal, { open: true, onClose: props.onClose, title: t('oauth.title', { name }), closeLabel: t('close'), footer: (_jsxs(_Fragment, { children: [props.connected
                    ? _jsx(Button, { variant: "outline", onClick: () => { void props.signOut(); }, disabled: busy, children: t('oauth.signOut') })
                    : null, attempt !== undefined && !final
                    ? _jsx(Button, { variant: "outline", onClick: cancel, disabled: busy, children: t('oauth.cancel') })
                    : null, _jsx(Button, { variant: "primary", onClick: props.onClose, disabled: busy, children: t('oauth.done') })] })), children: _jsxs("div", { className: cx('dsh-mcp-probe'), children: [attempt !== undefined
                    ? (_jsxs("div", { className: cx('dsh-mcp-status'), "data-tone": attempt.phase === 'authorized' ? 'done' : attempt.phase === 'failed' ? 'error' : 'ongoing', children: [_jsx(StateDot, { state: attempt.phase === 'authorized' ? 'done' : attempt.phase === 'failed' ? 'error' : 'ongoing', size: 8 }), t(PHASE_KEYS[attempt.phase], { error: attempt.lastError ?? error ?? '' })] }))
                    : _jsx("p", { children: busy ? t('oauth.starting') : t('oauth.startFailed', { message: error ?? '' }) }), attempt?.lastError !== undefined ? _jsx("p", { className: cx('dsh-mcp-detail'), children: attempt.lastError }) : null, error !== undefined && attempt === undefined ? _jsx("p", { className: cx('dsh-mcp-detail'), children: error }) : null, waiting && attempt?.authorizationUrl !== undefined
                    ? (_jsxs("a", { className: cx('dsh-mcp-oauth-link'), href: attempt.authorizationUrl, target: "_blank", rel: "noopener noreferrer", children: [_jsx(IconLinkOutlineRegular, { size: 14 }), t('oauth.open')] }))
                    : null, !final ? _jsx("p", { className: cx('dsh-mcp-note'), children: t('oauth.hint') }) : null, attempt === undefined ? _jsx(Button, { variant: "outline", size: "sm", onClick: start, disabled: busy, children: t('retry') }) : null] }) }));
}
//# sourceMappingURL=OAuthDialog.js.map