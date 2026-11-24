/** One server row: identity, source, live status, actions, and the tool policy. */
import type { McpLocaleKey } from './locales.ts';
import type { ServerSummary } from './summary.ts';
/** Everything the card may ask the page to do. */
export interface ServerCardProps {
    readonly row: ServerSummary;
    readonly t: (key: McpLocaleKey, params?: Record<string, unknown>) => string;
    readonly busy: boolean;
    readonly onToggle: (row: ServerSummary, enabled: boolean) => void;
    readonly onEdit: (row: ServerSummary) => void;
    readonly onDelete: (row: ServerSummary) => void;
    readonly onRestart: (row: ServerSummary) => void;
    readonly onProbe: (row: ServerSummary) => void;
    readonly onAuthorize: (row: ServerSummary) => void;
    readonly onSignOut: (row: ServerSummary) => void;
    readonly onToolToggle: (row: ServerSummary, tool: string, enabled: boolean) => void;
    readonly onCopy: (row: ServerSummary) => void;
}
export declare function ServerCard(props: ServerCardProps): import("react").JSX.Element;
//# sourceMappingURL=ServerCard.d.ts.map