/** The OAuth dialog: the Host starts the attempt; the browser only opens the page and cancels. */
import type { AuthorizationResult } from '../types.ts';
import type { McpLocaleKey } from './locales.ts';
export interface OAuthDialogProps {
    readonly name: string;
    readonly connected: boolean;
    readonly t: (key: McpLocaleKey, params?: Record<string, unknown>) => string;
    readonly onClose: () => void;
    readonly start: () => Promise<AuthorizationResult | undefined>;
    readonly cancel: (id: string) => Promise<boolean>;
    readonly signOut: () => Promise<boolean>;
}
export declare function OAuthDialog(props: OAuthDialogProps): import("react").JSX.Element;
//# sourceMappingURL=OAuthDialog.d.ts.map