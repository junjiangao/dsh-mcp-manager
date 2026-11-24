/** The probe dialog: one throwaway connection that reports what the server advertises. */
import type { McpProbeResult } from '@deepseek-ai/dsh-mcp-client/types';
import type { McpLocaleKey } from './locales.ts';
export interface ProbeDialogProps {
    readonly name: string;
    readonly t: (key: McpLocaleKey, params?: Record<string, unknown>) => string;
    readonly onClose: () => void;
    readonly run: (name: string) => Promise<{
        readonly ok: true;
        readonly result: McpProbeResult;
    } | {
        readonly ok: false;
        readonly message: string;
    }>;
}
export declare function ProbeDialog(props: ProbeDialogProps): import("react").JSX.Element;
//# sourceMappingURL=ProbeDialog.d.ts.map