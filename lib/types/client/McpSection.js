import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Settings → MCP: one page over the official entries and every file scope. */
import { useMemo, useState, useSyncExternalStore } from 'react';
import { Button, IconPlusOutlineRegular, IconRefreshOutlineRegular, Input, Modal, RiskConfirmation, SegmentedControl, StateDot, Tag, } from '@deepseek-ai/dsh-client-ui-primitives';
import { createDraft, entryFromDraft, patchFromDraft, scopeOf } from "./draft.js";
import { buildSummaries, filterSummaries, rowToJson } from "./summary.js";
import { countStatuses } from "./status.js";
import { copyText, cx, PANEL_CSS } from "./panel-css.js";
import { ServerCard } from "./ServerCard.js";
import { ServerEditor } from "./ServerEditor.js";
import { ProbeDialog } from "./ProbeDialog.js";
import { OAuthDialog } from "./OAuthDialog.js";
export function McpSection(props) {
    const { t } = props;
    const store = props.store;
    const state = useSyncExternalStore(store.state.subscribe, store.state.getSnapshot);
    const [search, setSearch] = useState('');
    const [source, setSource] = useState('all');
    const [status, setStatus] = useState('all');
    const [editor, setEditor] = useState(undefined);
    const [probe, setProbe] = useState(undefined);
    const [oauth, setOauth] = useState(undefined);
    const [deleting, setDeleting] = useState(undefined);
    const [acknowledged, setAcknowledged] = useState(false);
    const entryServers = state.upstream.value?.servers ?? {};
    const disabledTools = state.own.value?.disabledTools ?? {};
    const entryWritable = state.upstream.status === 'ready' && state.upstream.writable;
    const all = useMemo(() => buildSummaries(state.snapshot, state.managed, entryServers, disabledTools, entryWritable), [state.snapshot, state.managed, entryServers, disabledTools, entryWritable]);
    const rows = useMemo(() => filterSummaries(all, search, source, status), [all, search, source, status]);
    const counts = useMemo(() => countStatuses(all.map(row => row.runtime)), [all]);
    const workspaces = state.snapshot?.workspaces ?? [];
    const sources = state.snapshot?.sources ?? [];
    const busy = state.busy;
    const oauthName = oauth;
    const oauthRow = oauthName === undefined ? undefined : all.find(row => row.name === oauthName);
    const deleteOpen = deleting !== undefined;
    const beginDelete = (row) => {
        setAcknowledged(false);
        setDeleting(row);
    };
    const confirmDelete = () => {
        if (deleting === undefined)
            return;
        void store.removeServer(deleting);
        setDeleting(undefined);
        setAcknowledged(false);
    };
    const saveEditor = (draft) => {
        const current = editor;
        if (current === undefined)
            return;
        const original = current.row;
        const write = draft.target === 'entry'
            ? store.saveEntry(draft.name, entryFromDraft(draft))
            : store.upsertServer({ scope: scopeOf(draft.target), server: patchFromDraft(draft) });
        void write.then((accepted) => {
            if (!accepted)
                return;
            if (original !== undefined && original.name !== draft.name) {
                if (original.kind === 'entry')
                    void store.removeEntry(original.name);
                else
                    void store.removeServer(original);
            }
            setEditor(undefined);
        });
    };
    const openEditor = (row) => {
        const defaultTarget = entryWritable ? 'entry' : 'profile';
        setEditor({ ...row === undefined ? {} : { row }, draft: createDraft(row, defaultTarget) });
    };
    return (_jsxs("section", { className: cx('dsh-mcp'), "aria-labelledby": "dsh-mcp-title", children: [_jsx("style", { children: PANEL_CSS }), _jsxs("header", { className: cx('dsh-mcp-hero'), children: [_jsxs("div", { children: [_jsx("h2", { id: "dsh-mcp-title", children: t('title') }), _jsx("p", { children: t('subtitle') })] }), _jsxs("div", { className: cx('dsh-mcp-hero-actions'), children: [_jsx(Button, { variant: "outline", size: "sm", icon: _jsx(IconRefreshOutlineRegular, { size: 14 }), disabled: busy, onClick: () => { store.refresh(); }, children: busy ? t('refreshing') : t('refresh') }), _jsx(Button, { variant: "primary", size: "sm", icon: _jsx(IconPlusOutlineRegular, { size: 14 }), onClick: () => { openEditor(undefined); }, children: t('add') })] })] }), state.streamFailed ? (_jsx("div", { className: cx('dsh-mcp-banner'), "data-tone": "warning", role: "status", children: _jsx("span", { className: cx('dsh-mcp-banner-text'), children: t('error.stream') }) })) : null, state.pollFailed ? (_jsx("div", { className: cx('dsh-mcp-banner'), "data-tone": "warning", role: "status", children: _jsx("span", { className: cx('dsh-mcp-banner-text'), children: t('error.snapshot', { message: state.error ?? '' }) }) })) : null, state.upstream.status === 'unavailable' ? (_jsx("div", { className: cx('dsh-mcp-banner'), "data-tone": "warning", children: _jsx("span", { className: cx('dsh-mcp-banner-text'), children: t('error.upstream') }) })) : null, state.notice !== undefined ? (_jsxs("div", { className: cx('dsh-mcp-banner'), "data-tone": state.notice.tone === 'error' ? 'error' : 'success', role: state.notice.tone === 'error' ? 'alert' : 'status', children: [_jsx("span", { className: cx('dsh-mcp-banner-text'), children: state.notice.text }), _jsx("span", { className: cx('dsh-mcp-banner-close'), children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => { store.clearNotice(); }, children: t('close') }) })] })) : null, _jsxs("div", { className: cx('dsh-mcp-toolbar'), children: [_jsx("div", { className: cx('dsh-mcp-search'), children: _jsx(Input, { type: "search", value: search, placeholder: t('filter.searchPlaceholder'), "aria-label": t('filter.search'), onChange: (event) => { setSearch(event.target.value); } }) }), _jsx(SegmentedControl, { id: "dsh-mcp-source", label: t('filter.source'), value: source, options: [
                            { value: 'all', label: t('filter.all') },
                            { value: 'entry', label: t('source.entry') },
                            { value: 'file', label: t('source.file') },
                        ], onChange: next => { setSource(next); } }), _jsx(SegmentedControl, { id: "dsh-mcp-status", label: t('filter.status'), value: status, options: [
                            { value: 'all', label: t('filter.all') },
                            { value: 'connected', label: t('status.connected') },
                            { value: 'busy', label: t('status.connecting') },
                            { value: 'attention', label: t('filter.attention') },
                            { value: 'disabled', label: t('status.disabled') },
                        ], onChange: next => { setStatus(next); } }), workspaces.length > 0 ? (_jsxs("label", { className: cx('dsh-mcp-project'), children: [_jsx("span", { children: t('scope.project') }), _jsxs("select", { value: state.projectPath ?? '', disabled: busy, onChange: (event) => { store.selectProject(event.target.value === '' ? undefined : event.target.value); }, children: [_jsx("option", { value: "", children: t('none') }), workspaces.map(workspace => (_jsx("option", { value: workspace.path, children: workspace.title ?? workspace.path }, workspace.path)))] })] })) : null] }), _jsxs("div", { className: cx('dsh-mcp-summary'), children: [_jsxs("span", { className: cx('dsh-mcp-summary-chip'), children: [_jsx(StateDot, { state: counts.connected > 0 ? 'done' : 'idle', size: 8 }), t('summary.connected', { count: counts.connected })] }), _jsxs("span", { className: cx('dsh-mcp-summary-chip'), children: [_jsx(StateDot, { state: counts.busy > 0 ? 'ongoing' : 'idle', size: 8 }), t('summary.busy', { count: counts.busy })] }), _jsxs("span", { className: cx('dsh-mcp-summary-chip'), children: [_jsx(StateDot, { state: counts.attention > 0 ? 'warning' : 'idle', size: 8 }), t('summary.attention', { count: counts.attention })] }), _jsxs("span", { className: cx('dsh-mcp-summary-chip'), children: [_jsx(StateDot, { state: "idle", size: 8 }), t('summary.disabled', { count: counts.disabled })] }), _jsx("span", { className: cx('dsh-mcp-summary-total'), children: t('count', { count: counts.total }) })] }), state.status === 'error' ? (_jsxs("div", { className: cx('dsh-mcp-empty'), children: [_jsx("strong", { children: t('error.snapshot', { message: state.error ?? '' }) }), _jsx(Button, { variant: "outline", onClick: () => { store.refresh(); }, children: t('retry') })] })) : null, state.status === 'loading' ? _jsx("div", { className: cx('dsh-mcp-loading'), children: t('loading.servers') }) : null, state.status === 'ready' && rows.length === 0 ? (_jsxs("div", { className: cx('dsh-mcp-empty'), children: [_jsx("strong", { children: t('empty.title') }), _jsx("span", { children: all.length === 0 ? t('empty.description') : t('filter.search') }), _jsx(Button, { variant: "primary", size: "sm", icon: _jsx(IconPlusOutlineRegular, { size: 14 }), onClick: () => { openEditor(undefined); }, children: all.length === 0 ? t('empty.action') : t('add') })] })) : null, _jsx("div", { className: cx('dsh-mcp-list'), children: rows.map(row => (_jsx(ServerCard, { row: row, t: t, busy: busy, onToggle: (target, enabled) => { void store.setEnabled(target, enabled); }, onEdit: target => { openEditor(target); }, onDelete: beginDelete, onRestart: target => { void store.restart(target.name); }, onProbe: target => { setProbe(target.name); }, onAuthorize: target => { setOauth(target.name); }, onSignOut: target => { void store.signOut(target.name); }, onToolToggle: (target, tool, enabled) => { void store.setToolEnabled(target.name, tool, enabled); }, onCopy: target => {
                        void copyText(rowToJson(target)).then((copied) => { store.notify(t(copied ? 'notice.copied' : 'notice.copyFailed'), copied ? 'success' : 'error'); });
                    } }, `${row.kind}:${row.name}`))) }), sources.length > 0 ? (_jsxs("details", { className: cx('dsh-mcp-sources'), children: [_jsx("summary", { children: t('sources.title') }), _jsxs("div", { className: cx('dsh-mcp-sources-body'), children: [_jsx("p", { className: cx('dsh-mcp-note'), children: t('sources.hint') }), sources.map(file => (_jsxs("div", { className: cx('dsh-mcp-source-row'), children: [_jsx(Tag, { tone: file.compat ? 'warning' : 'outline', children: scopeLabel(file.scope, t) }), _jsx("code", { children: file.path }), _jsxs("span", { className: cx('dsh-mcp-tag-note'), children: [file.exists ? (file.writable ? t('sources.writable') : t('sources.readonly')) : t('sources.missing'), ' · ', t('sources.count', { count: file.serverCount })] })] }, `${file.scope}:${file.path}`)))] })] })) : null, _jsx("p", { className: cx('dsh-mcp-note'), children: t('panel.toolsNote') }), editor !== undefined ? (_jsx(Modal, { open: true, onClose: () => { setEditor(undefined); }, closeLabel: t('close'), title: editor.row === undefined ? t('editor.new') : t('editor.edit', { name: editor.row.name }), children: _jsx(ServerEditor, { row: editor.row, draft: editor.draft, busy: busy, entryWritable: entryWritable, hasWorkspace: workspaces.length > 0, hasProjectSelection: state.projectPath !== undefined, t: t, onClose: () => { setEditor(undefined); }, onSave: saveEditor }, `${editor.row?.kind ?? 'new'}:${editor.row?.name ?? 'new'}`) })) : null, probe !== undefined ? (_jsx(ProbeDialog, { name: probe, t: t, onClose: () => { setProbe(undefined); }, run: name => store.probe(name) }, probe)) : null, oauthName !== undefined ? (_jsx(OAuthDialog, { name: oauthName, t: t, connected: oauthRow?.runtime?.status.state === 'connected', onClose: () => { setOauth(undefined); }, start: () => store.authorize(oauthName), cancel: id => store.cancelAuthorization(oauthName, id), signOut: () => store.signOut(oauthName) }, oauthName)) : null, _jsx(RiskConfirmation, { open: deleteOpen, title: t('confirm.deleteTitle'), description: deleting === undefined ? '' : t('confirm.deleteDescription', { name: deleting.name }), acknowledgeLabel: t('confirm.acknowledge'), cancelLabel: t('confirm.cancel'), closeLabel: t('close'), confirmLabel: t('confirm.delete'), acknowledged: acknowledged, disabled: busy, onAcknowledgedChange: setAcknowledged, onCancel: () => { setDeleting(undefined); }, onConfirm: confirmDelete })] }));
}
function scopeLabel(scope, t) {
    switch (scope) {
        case 'project': return t('scope.project');
        case 'profile': return t('scope.profile');
        case 'user': return t('scope.user');
    }
}
//# sourceMappingURL=McpSection.js.map