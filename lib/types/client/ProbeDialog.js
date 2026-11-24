import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** The probe dialog: one throwaway connection that reports what the server advertises. */
import { useEffect, useRef, useState } from 'react';
import { Button, Modal, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { cx } from "./panel-css.js";
export function ProbeDialog(props) {
    const { t, name } = props;
    const [state, setState] = useState({ phase: 'running' });
    const runId = useRef(0);
    const run = () => {
        const current = ++runId.current;
        setState({ phase: 'running' });
        void props.run(name).then((outcome) => {
            if (runId.current !== current)
                return;
            setState(outcome.ok ? { phase: 'result', result: outcome.result } : { phase: 'rpc-failure', message: outcome.message });
        }, (error) => {
            if (runId.current !== current)
                return;
            setState({ phase: 'rpc-failure', message: error instanceof Error ? error.message : String(error) });
        });
    };
    useEffect(() => {
        run();
        return () => { runId.current += 1; };
        // The dialog is keyed by server name; a new name mounts a new dialog.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name]);
    return (_jsx(Modal, { open: true, onClose: props.onClose, title: t('probe.title', { name }), closeLabel: t('close'), footer: _jsx(Button, { variant: "primary", onClick: props.onClose, children: t('probe.done') }), children: _jsxs("div", { className: cx('dsh-mcp-probe'), children: [state.phase === 'running' ? _jsx("p", { children: t('probe.running') }) : null, state.phase === 'result' && state.result.ok ? _jsx(ProbeSuccess, { result: state.result, t: t }) : null, state.phase === 'result' && !state.result.ok ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: cx('dsh-mcp-status'), "data-tone": "error", children: [_jsx(StateDot, { state: "error", size: 8 }), t('probe.failure')] }), _jsxs("dl", { className: cx('dsh-mcp-kv'), children: [_jsx("dt", { children: t('probe.stage') }), _jsx("dd", { children: state.result.stage === 'connect' ? t('probe.stageConnect') : t('probe.stageList') }), _jsx("dt", { children: t('probe.duration') }), _jsxs("dd", { children: [state.result.durationMs, " ms"] })] }), _jsx("p", { className: cx('dsh-mcp-detail'), children: state.result.message }), _jsx("p", { className: cx('dsh-mcp-note'), children: state.result.closeConfirmed ? t('probe.closeConfirmed') : t('probe.cleanupError', { error: state.result.cleanupError ?? '' }) })] })) : null, state.phase === 'rpc-failure' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: cx('dsh-mcp-status'), "data-tone": "error", children: [_jsx(StateDot, { state: "error", size: 8 }), t('probe.failure')] }), _jsx("p", { className: cx('dsh-mcp-detail'), children: state.message })] })) : null, _jsx("div", { children: _jsx(Button, { variant: "outline", size: "sm", onClick: run, children: t('probe.again') }) })] }) }));
}
function ProbeSuccess(props) {
    const { result, t } = props;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: cx('dsh-mcp-status'), "data-tone": "done", children: [_jsx(StateDot, { state: "done", size: 8 }), t('probe.success')] }), _jsxs("dl", { className: cx('dsh-mcp-kv'), children: [result.serverInfo !== undefined
                        ? (_jsxs(_Fragment, { children: [_jsx("dt", { children: t('probe.server') }), _jsxs("dd", { children: [result.serverInfo.name, " ", result.serverInfo.version] })] }))
                        : null, _jsx("dt", { children: t('probe.duration') }), _jsxs("dd", { children: [result.durationMs, " ms"] }), _jsx("dt", { children: t('probe.tools') }), _jsx("dd", { children: result.toolNames.length === 0 ? t('probe.empty') : String(result.toolNames.length) })] }), result.truncated ? _jsx("p", { className: cx('dsh-mcp-note'), children: t('probe.truncated') }) : null, _jsx("div", { className: cx('dsh-mcp-probe-list'), children: result.toolNames.map(tool => _jsx("div", { className: cx('dsh-mcp-probe-item'), children: tool }, tool)) }), _jsx("p", { className: cx('dsh-mcp-note'), children: result.closeConfirmed ? t('probe.closeConfirmed') : result.cleanupError === undefined ? null : t('probe.cleanupError', { error: result.cleanupError }) })] }));
}
//# sourceMappingURL=ProbeDialog.js.map