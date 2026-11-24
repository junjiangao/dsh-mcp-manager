/** Runtime status → panel vocabulary. Pure: the caller passes the translator and clock. */
import type { McpManagedServerStatus, McpManagedServerView } from '@deepseek-ai/dsh-mcp-manager';
import type { McpLocaleKey } from './locales.ts';
export type StatusTone = 'done' | 'ongoing' | 'warning' | 'error' | 'idle';
export interface StatusText {
    readonly tone: StatusTone;
    readonly label: string;
    readonly detail?: string;
}
type Translate = (key: McpLocaleKey, params?: Record<string, unknown>) => string;
/**
 * Describe one managed server's status.
 * @param view - the manager's view, or `undefined` when the status stream has not delivered it yet.
 * @param t - the page translator.
 * @param now - current epoch milliseconds, for relative times.
 * @returns the state dot tone, the short label, and the explanatory line.
 */
export declare function describeStatus(view: McpManagedServerView | undefined, t: Translate, now?: number): StatusText;
/** Describe one status value; exported for tests that do not build a view. */
export declare function describeStatusValue(status: McpManagedServerStatus, t: Translate, now?: number): StatusText;
/** The official state-dot value for a status tone. */
export declare function dotState(tone: StatusTone): 'done' | 'ongoing' | 'warning' | 'error' | 'idle';
/** The official tag tone for a status tone. */
export declare function tagTone(tone: StatusTone): 'success' | 'info' | 'warning' | 'danger' | 'neutral';
/** Count the summaries the header shows. */
export interface StatusCounts {
    readonly total: number;
    readonly connected: number;
    readonly busy: number;
    readonly attention: number;
    readonly disabled: number;
}
export declare function countStatuses(views: readonly (McpManagedServerView | undefined)[]): StatusCounts;
export {};
//# sourceMappingURL=status.d.ts.map