/** The create/edit dialog for one MCP server, whichever store it lives in. */
import type { McpLocaleKey } from './locales.ts';
import { type ServerDraft } from './draft.ts';
import type { ServerSummary } from './summary.ts';
export interface ServerEditorProps {
    /** The server being edited, or `undefined` when creating one. */
    readonly row: ServerSummary | undefined;
    readonly draft: ServerDraft;
    readonly busy: boolean;
    readonly entryWritable: boolean;
    readonly hasWorkspace: boolean;
    readonly hasProjectSelection: boolean;
    readonly t: (key: McpLocaleKey, params?: Record<string, unknown>) => string;
    readonly onClose: () => void;
    readonly onSave: (draft: ServerDraft) => void;
}
export declare function ServerEditor(props: ServerEditorProps): import("react").JSX.Element;
//# sourceMappingURL=ServerEditor.d.ts.map