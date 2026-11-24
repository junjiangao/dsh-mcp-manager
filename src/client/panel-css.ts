/**
 * The page stylesheet, injected once by the section.
 *
 * The product ships no CSS-module loader for third-party client plugins, so the
 * rules live in one scoped string. Every selector is prefixed with
 * `.dsh-mcp` and every color is an official `--dsw-*` token with a light-theme
 * fallback; dark mode comes from the host's `data-ds-dark-theme` attribute.
 */

const COLORS = {
  text: 'var(--dsw-alias-label-primary, #1b1e23)',
  secondary: 'var(--dsw-alias-label-secondary, #5d6470)',
  tertiary: 'var(--dsw-alias-label-tertiary, #8a919c)',
  border: 'var(--dsw-alias-border-l2, #e1e4ea)',
  borderSubtle: 'var(--dsw-alias-border-l1, #eceef2)',
  borderControl: 'var(--dsw-alias-border-l4, #dcdfe5)',
  surface: 'var(--dsw-alias-bg-layer-2, #ffffff)',
  surfaceSubtle: 'var(--dsw-alias-bg-layer-1, #fafbfc)',
  surfaceRaised: 'var(--dsw-alias-bg-layer-3, #f4f5f7)',
  business: 'var(--dsw-alias-state-business-primary, #2f6fed)',
  businessSoft: 'var(--dsw-alias-state-business-tertiary, #eaf1ff)',
  warn: 'var(--dsw-alias-state-warn-primary, #b7791f)',
  warnSoft: 'var(--dsw-alias-state-warn-tertiary, #fff6e5)',
  danger: 'var(--dsw-alias-state-error-primary, #c93c37)',
  dangerSoft: 'var(--dsw-alias-state-error-tertiary, #fdeeee)',
  success: 'var(--dsw-alias-state-success-primary, #1c7c4a)',
  successSoft: 'var(--dsw-alias-state-success-tertiary, #e9f8ef)',
  shadow: 'var(--dsw-alias-drop-shadow-1, 0 8px 24px rgba(16, 24, 40, 0.10))',
} as const

const RADIUS = 'var(--dsw-radius-md, 8px)'
const RADIUS_SM = 'var(--dsw-radius-sm, 6px)'
const MONO = 'var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)'
const FOCUS = '0 0 0 2px var(--dsw-alias-state-business-tertiary, #dbe7ff)'

export const PANEL_CSS = `
.dsh-mcp {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: ${COLORS.text};
  font-size: 13px;
  line-height: 1.55;
}
.dsh-mcp * { box-sizing: border-box; }
/* The dialog portals to document.body, so the panel scope above never reaches it: restore the same
   base type scale and box model on the dialog root, and cap its height the way the host contracts ask. */
.dsh-mcp-dialog {
  width: min(560px, 100%);
  max-height: 100%;
  color: ${COLORS.text};
  font-size: 13px;
  line-height: 1.55;
}
.dsh-mcp-dialog * { box-sizing: border-box; }
.dsh-mcp-dialog-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.dsh-mcp-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.dsh-mcp-hero h2 { margin: 0 0 4px; font-size: 18px; font-weight: 600; line-height: 1.3; }
.dsh-mcp-hero p { margin: 0; color: ${COLORS.secondary}; max-width: 62ch; }
.dsh-mcp-hero-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-mcp-banner {
  display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: ${RADIUS};
  border: 1px solid ${COLORS.border}; background: ${COLORS.surfaceRaised}; color: ${COLORS.secondary};
}
.dsh-mcp-banner[data-tone="error"] { border-color: ${COLORS.danger}; background: ${COLORS.dangerSoft}; color: ${COLORS.danger}; }
.dsh-mcp-banner[data-tone="warning"] { border-color: ${COLORS.warn}; background: ${COLORS.warnSoft}; color: ${COLORS.warn}; }
.dsh-mcp-banner[data-tone="success"] { border-color: ${COLORS.success}; background: ${COLORS.successSoft}; color: ${COLORS.success}; }
.dsh-mcp-banner-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.dsh-mcp-banner-close { flex: none; }
.dsh-mcp-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.dsh-mcp-search { flex: 1 1 240px; min-width: 180px; }
.dsh-mcp-search input { width: 100%; }
.dsh-mcp-project { display: inline-flex; align-items: center; gap: 6px; color: ${COLORS.secondary}; }
.dsh-mcp-project select {
  max-width: 280px; padding: 5px 8px; border-radius: ${RADIUS_SM}; border: 1px solid ${COLORS.border};
  background: ${COLORS.surface}; color: ${COLORS.text}; font: inherit;
}
.dsh-mcp-project select:focus-visible { outline: none; box-shadow: ${FOCUS}; }
.dsh-mcp-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; color: ${COLORS.secondary}; }
.dsh-mcp-summary-chip { display: inline-flex; align-items: center; gap: 6px; }
.dsh-mcp-summary-total { margin-left: auto; color: ${COLORS.tertiary}; }
.dsh-mcp-list { display: flex; flex-direction: column; gap: 10px; }
.dsh-mcp-card {
  display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}; background: ${COLORS.surface};
}
.dsh-mcp-card[data-disabled="true"] { background: ${COLORS.surfaceSubtle}; }
.dsh-mcp-card-head { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
.dsh-mcp-name { font-family: ${MONO}; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
.dsh-mcp-head-tags { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dsh-mcp-head-end { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.dsh-mcp-status { display: inline-flex; align-items: center; gap: 6px; color: ${COLORS.secondary}; white-space: nowrap; }
.dsh-mcp-status[data-tone="error"] { color: ${COLORS.danger}; }
.dsh-mcp-status[data-tone="warning"] { color: ${COLORS.warn}; }
.dsh-mcp-status[data-tone="done"] { color: ${COLORS.success}; }
.dsh-mcp-meta { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: baseline; color: ${COLORS.secondary}; }
.dsh-mcp-meta code, .dsh-mcp-code {
  font-family: ${MONO}; font-size: 12px; color: ${COLORS.text}; background: ${COLORS.surfaceRaised};
  padding: 1px 6px; border-radius: ${RADIUS_SM}; overflow-wrap: anywhere;
}
.dsh-mcp-detail { color: ${COLORS.secondary}; overflow-wrap: anywhere; }
.dsh-mcp-detail strong { color: ${COLORS.danger}; font-weight: 500; }
.dsh-mcp-inline-note { display: flex; align-items: flex-start; gap: 6px; color: ${COLORS.warn}; }
.dsh-mcp-inline-note[data-tone="error"] { color: ${COLORS.danger}; }
.dsh-mcp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.dsh-mcp-actions-end { margin-left: auto; display: inline-flex; gap: 6px; }
.dsh-mcp-tools { border-top: 1px dashed ${COLORS.border}; padding-top: 8px; }
.dsh-mcp-tools summary {
  display: flex; align-items: center; gap: 6px; cursor: pointer; color: ${COLORS.secondary}; list-style: none;
}
.dsh-mcp-tools summary::-webkit-details-marker { display: none; }
.dsh-mcp-tools summary::before {
  content: ''; width: 0; height: 0; border-left: 4px solid currentColor; border-top: 4px solid transparent;
  border-bottom: 4px solid transparent; transition: transform 120ms ease;
}
.dsh-mcp-tools[open] summary::before { transform: rotate(90deg); }
.dsh-mcp-tools-body { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.dsh-mcp-tools-search input { width: 100%; max-width: 320px; }
.dsh-mcp-tool-list { display: flex; flex-direction: column; gap: 2px; max-height: 320px; overflow: auto; }
.dsh-mcp-tool {
  display: flex; align-items: flex-start; gap: 12px; padding: 6px 8px; border-radius: ${RADIUS_SM};
}
.dsh-mcp-tool:hover { background: ${COLORS.surfaceSubtle}; }
.dsh-mcp-tool-main { flex: 1; min-width: 0; }
.dsh-mcp-tool-name { font-family: ${MONO}; font-size: 12px; overflow-wrap: anywhere; }
.dsh-mcp-tool-desc { color: ${COLORS.tertiary}; font-size: 12px; overflow-wrap: anywhere; }
.dsh-mcp-tool-toggle { flex: none; }
.dsh-mcp-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 16px; text-align: center;
  border: 1px dashed ${COLORS.border}; border-radius: ${RADIUS}; color: ${COLORS.secondary};
}
.dsh-mcp-empty strong { color: ${COLORS.text}; font-size: 14px; }
.dsh-mcp-sources { border: 1px solid ${COLORS.border}; border-radius: ${RADIUS}; background: ${COLORS.surfaceSubtle}; }
.dsh-mcp-sources summary { cursor: pointer; padding: 10px 14px; color: ${COLORS.secondary}; }
.dsh-mcp-sources-body { display: flex; flex-direction: column; gap: 8px; padding: 0 14px 14px; }
.dsh-mcp-source-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.dsh-mcp-source-row code { font-family: ${MONO}; font-size: 11px; overflow-wrap: anywhere; }
.dsh-mcp-note { color: ${COLORS.tertiary}; font-size: 12px; margin: 0; }
.dsh-mcp-editor { display: flex; flex-direction: column; gap: 14px; }
.dsh-mcp-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dsh-mcp-field > label, .dsh-mcp-field-label { color: ${COLORS.secondary}; font-size: 12px; }
/* Input primitives draw their own frame on the wrapper: never restyle the inner <input>. */
.dsh-mcp-input-invalid { border-color: ${COLORS.danger}; }
.dsh-mcp-target {
  width: 100%; height: 32px; padding: 0 12px; border-radius: ${RADIUS};
  border: 0.5px solid ${COLORS.borderControl}; background: ${COLORS.surfaceSubtle}; color: ${COLORS.text};
  font: inherit; font-size: 14px;
}
.dsh-mcp-target:focus-visible { outline: none; border-color: ${COLORS.business}; }
.dsh-mcp-field-hint { color: ${COLORS.tertiary}; font-size: 11px; overflow-wrap: anywhere; }
.dsh-mcp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.dsh-mcp-section-title { font-weight: 600; color: ${COLORS.text}; margin: 0; }
.dsh-mcp-rows { display: flex; flex-direction: column; gap: 8px; }
.dsh-mcp-row { display: flex; align-items: center; gap: 6px; }
.dsh-mcp-row-input { flex: 1 1 auto; min-width: 0; }
.dsh-mcp-row-key, .dsh-mcp-row-value { min-width: 0; width: 100%; }
/* Key/value rows: key + remove above the value + flag, so the dialog's ~330px column never wraps either. */
.dsh-mcp-map-row {
  display: grid; align-items: center; gap: 6px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-areas: 'key key remove' 'value flag remove';
}
.dsh-mcp-map-row > .dsh-mcp-row-key { grid-area: key; }
.dsh-mcp-map-row > .dsh-mcp-row-value { grid-area: value; }
.dsh-mcp-map-row > .dsh-mcp-row-flag { grid-area: flag; }
.dsh-mcp-map-row > .dsh-mcp-row-remove { grid-area: remove; }
.dsh-mcp-row-flag { display: inline-flex; align-items: center; gap: 4px; color: ${COLORS.secondary}; font-size: 12px; white-space: nowrap; }
.dsh-mcp-row-remove { flex: none; }
.dsh-mcp-tag-note { color: ${COLORS.tertiary}; font-size: 11px; }
.dsh-mcp-probe { display: flex; flex-direction: column; gap: 10px; }
.dsh-mcp-probe-list { display: flex; flex-direction: column; gap: 2px; max-height: 280px; overflow: auto; }
.dsh-mcp-probe-item { font-family: ${MONO}; font-size: 12px; padding: 3px 6px; border-radius: ${RADIUS_SM}; background: ${COLORS.surfaceSubtle}; }
.dsh-mcp-kv { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; font-size: 12px; }
.dsh-mcp-kv dt { color: ${COLORS.secondary}; }
.dsh-mcp-kv dd { margin: 0; overflow-wrap: anywhere; }
.dsh-mcp-oauth-link {
  display: inline-flex; align-items: center; gap: 6px; color: ${COLORS.business}; overflow-wrap: anywhere;
}
.dsh-mcp-loading { display: flex; align-items: center; gap: 8px; padding: 24px 0; color: ${COLORS.secondary}; }
.dsh-mcp-visually-hidden {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (max-width: 767px) {
  .dsh-mcp-hero { flex-direction: column; }
  .dsh-mcp-hero-actions { width: 100%; }
  .dsh-mcp-card { padding: 12px; }
  .dsh-mcp-head-end { margin-left: 0; width: 100%; }
  .dsh-mcp-summary-total { margin-left: 0; }
  .dsh-mcp-source-row { flex-direction: column; gap: 2px; }
}
`

/** Join truthy class names. */
export function cx(...names: (string | false | undefined)[]): string {
  return names.filter((name): name is string => typeof name === 'string' && name !== '').join(' ')
}

/**
 * Copy text through the Clipboard API, falling back to a hidden textarea.
 * @param text - the text to copy.
 * @returns whether the copy succeeded.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  if (typeof document === 'undefined') return false
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = typeof document.execCommand === 'function' ? document.execCommand('copy') : false
    area.remove()
    return copied
  } catch {
    return false
  }
}
