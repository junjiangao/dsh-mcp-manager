import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** One server row: identity, source, live status, actions, and the tool policy. */
import { useMemo, useState } from 'react';
import { Button, IconCloseOutlineRegular, IconCopyOutlineRegular, IconEditOutlineRegular, IconPlayOutlineRegular, IconRefreshOutlineRegular, Input, StateDot, Switch, Tag, } from '@deepseek-ai/dsh-client-ui-primitives';
import { cx } from "./panel-css.js";
import { describeStatus } from "./status.js";
export function ServerCard(props) {
    const { row, t, busy } = props;
    const [toolFilter, setToolFilter] = useState('');
    const status = useMemo(() => describeStatus(row.runtime, t), [row.runtime, t]);
    const tools = useMemo(() => {
        const needle = toolFilter.trim().toLocaleLowerCase();
        if (needle === '')
            return row.tools;
        return row.tools.filter(tool => `${tool.name} ${tool.description}`.toLocaleLowerCase().includes(needle));
    }, [row.tools, toolFilter]);
    const sourceLabel = row.kind === 'entry' ? t('scope.entry') : scopeLabel(row.scope, t);
    const canEdit = row.writable;
    const oauth = row.oauth !== undefined;
    const authorizationPending = row.runtime?.status.state === 'waiting-authorization';
    const registrationNote = row.registration !== undefined && row.registration.state !== 'registered' && row.registration.state !== 'disabled'
        ? registrationText(row, t)
        : undefined;
    return (_jsxs("article", { className: cx('dsh-mcp-card'), "data-disabled": !row.enabled, children: [_jsxs("div", { className: cx('dsh-mcp-card-head'), children: [_jsx("span", { className: cx('dsh-mcp-name'), children: row.name }), _jsxs("span", { className: cx('dsh-mcp-head-tags'), children: [_jsx(Tag, { tone: row.kind === 'entry' ? 'info' : 'outline', children: sourceLabel }), row.compat ? _jsx(Tag, { tone: "neutral", children: t('sources.compat') }) : null, row.compat ? _jsx(Tag, { tone: "warning", children: t('card.readonly') }) : null, _jsx(Tag, { tone: "quiet", children: row.transport === 'stdio' ? t('card.stdio') : t('card.http') }), oauth ? _jsx(Tag, { tone: "info", children: t('card.oauth') }) : null, row.toolLoading === 'on-demand' ? _jsx(Tag, { tone: "neutral", children: t('editor.onDemand') }) : null, row.disabledTools.length > 0
                                ? _jsx(Tag, { tone: "warning", children: t('card.disabledTools', { count: row.disabledTools.length }) })
                                : null] }), _jsxs("span", { className: cx('dsh-mcp-head-end'), children: [_jsxs("span", { className: cx('dsh-mcp-status'), "data-tone": status.tone, children: [_jsx(StateDot, { state: status.tone, size: 8 }), status.label] }), _jsx(Switch, { checked: row.enabled, disabled: busy || !canEdit, label: t(row.enabled ? 'action.disable' : 'action.enable'), title: canEdit ? undefined : t('card.readonly'), onChange: next => { props.onToggle(row, next); } })] })] }), _jsxs("div", { className: cx('dsh-mcp-meta'), children: [row.transport === 'stdio'
                        ? (_jsxs(_Fragment, { children: [_jsx("span", { children: t('card.command') }), _jsx("code", { children: row.command === '' ? '—' : row.command }), row.args.length > 0 ? _jsx("code", { children: row.args.join(' ') }) : null, row.cwd !== '' ? _jsxs("span", { title: row.cwd, children: [t('card.cwd'), ": ", _jsx("code", { children: row.cwd })] }) : null] }))
                        : (_jsxs(_Fragment, { children: [_jsx("span", { children: t('card.url') }), _jsx("code", { children: row.url === '' ? '—' : row.url })] })), row.kind === 'file' && row.path !== undefined ? (_jsxs("span", { title: row.path, children: [t('card.path'), ": ", _jsx("code", { children: row.path })] })) : null] }), status.detail !== undefined ? _jsx("div", { className: cx('dsh-mcp-detail'), children: status.detail }) : null, registrationNote !== undefined
                ? _jsx("div", { className: cx('dsh-mcp-inline-note'), "data-tone": row.registration?.state === 'conflict' ? 'error' : undefined, children: registrationNote })
                : null, row.shadowed.length > 0
                ? _jsx("div", { className: cx('dsh-mcp-inline-note'), children: t('card.shadowed', { scopes: row.shadowed.map(scope => scopeLabel(scope, t)).join(', ') }) })
                : null, row.conflict
                ? _jsx("div", { className: cx('dsh-mcp-inline-note'), "data-tone": "error", children: t('registration.conflict') })
                : null, row.kind === 'entry' ? _jsx("p", { className: cx('dsh-mcp-note'), children: t('card.entryHint') }) : null, _jsxs("div", { className: cx('dsh-mcp-actions'), children: [_jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(IconRefreshOutlineRegular, { size: 14 }), disabled: busy, onClick: () => { props.onRestart(row); }, children: t('action.restart') }), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(IconPlayOutlineRegular, { size: 14 }), disabled: busy, onClick: () => { props.onProbe(row); }, children: t('action.probe') }), oauth && authorizationPending
                        ? (_jsx(Button, { variant: "outline", size: "sm", disabled: busy, onClick: () => { props.onAuthorize(row); }, children: t('action.authorize') }))
                        : null, oauth && row.runtime?.status.state === 'connected'
                        ? (_jsx(Button, { variant: "ghost", size: "sm", disabled: busy, onClick: () => { props.onSignOut(row); }, children: t('action.signOut') }))
                        : null, _jsxs("span", { className: cx('dsh-mcp-actions-end'), children: [_jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(IconCopyOutlineRegular, { size: 14 }), disabled: busy, onClick: () => { props.onCopy(row); }, children: t('copyJson') }), canEdit
                                ? (_jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(IconEditOutlineRegular, { size: 14 }), disabled: busy, onClick: () => { props.onEdit(row); }, children: t('edit') }))
                                : null, canEdit
                                ? (_jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(IconCloseOutlineRegular, { size: 14 }), disabled: busy, onClick: () => { props.onDelete(row); }, children: t('delete') }))
                                : null] })] }), row.tools.length > 0
                ? (_jsxs("details", { className: cx('dsh-mcp-tools'), children: [_jsxs("summary", { children: [t('card.tools'), " \u00B7 ", t('card.toolCount', { count: row.tools.length })] }), _jsxs("div", { className: cx('dsh-mcp-tools-body'), children: [row.toolLoading === 'on-demand' ? _jsx("p", { className: cx('dsh-mcp-note'), children: t('card.onDemand') }) : null, row.tools.length > 6
                                    ? (_jsx("div", { className: cx('dsh-mcp-tools-search'), children: _jsx(Input, { type: "search", value: toolFilter, placeholder: t('tool.search'), "aria-label": t('tool.search'), onChange: (event) => { setToolFilter(event.target.value); } }) }))
                                    : null, _jsx("div", { className: cx('dsh-mcp-tool-list'), children: tools.map(tool => (_jsxs("div", { className: cx('dsh-mcp-tool'), children: [_jsxs("div", { className: cx('dsh-mcp-tool-main'), children: [_jsx("div", { className: cx('dsh-mcp-tool-name'), children: tool.name }), tool.description !== '' ? _jsx("div", { className: cx('dsh-mcp-tool-desc'), children: tool.description }) : null] }), _jsx("div", { className: cx('dsh-mcp-tool-toggle'), children: _jsx(Switch, { checked: tool.enabled, disabled: busy, label: t(tool.enabled ? 'tool.disable' : 'tool.enable'), onChange: next => { props.onToolToggle(row, tool.name, next); } }) })] }, tool.name))) })] })] }))
                : (_jsxs("details", { className: cx('dsh-mcp-tools'), children: [_jsx("summary", { children: t('card.tools') }), _jsxs("div", { className: cx('dsh-mcp-tools-body'), children: [_jsx("p", { className: cx('dsh-mcp-note'), children: t('card.noTools') }), row.toolLoading === 'on-demand' ? _jsx("p", { className: cx('dsh-mcp-note'), children: t('card.onDemand') }) : null] })] }))] }));
}
function scopeLabel(scope, t) {
    switch (scope) {
        case 'project': return t('scope.project');
        case 'profile': return t('scope.profile');
        case 'user': return t('scope.user');
        default: return t('scope.entry');
    }
}
function registrationText(row, t) {
    const registration = row.registration;
    if (registration === undefined)
        return undefined;
    switch (registration.state) {
        case 'missing-env': return t('registration.missingEnv', { names: (registration.missing ?? []).join(', ') });
        case 'invalid': return t('registration.invalid', { error: registration.error ?? '' });
        case 'conflict': return t('registration.conflict');
        case 'error': return t('registration.error', { error: registration.error ?? '' });
        default: return undefined;
    }
}
//# sourceMappingURL=ServerCard.js.map