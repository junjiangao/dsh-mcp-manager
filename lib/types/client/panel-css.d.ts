/**
 * The page stylesheet, injected once by the section.
 *
 * The product ships no CSS-module loader for third-party client plugins, so the
 * rules live in one scoped string. Every selector is prefixed with
 * `.dsh-mcp` and every color is an official `--dsw-*` token with a light-theme
 * fallback; dark mode comes from the host's `data-ds-dark-theme` attribute.
 */
export declare const PANEL_CSS: string;
/** Join truthy class names. */
export declare function cx(...names: (string | false | undefined)[]): string;
/**
 * Copy text through the Clipboard API, falling back to a hidden textarea.
 * @param text - the text to copy.
 * @returns whether the copy succeeded.
 */
export declare function copyText(text: string): Promise<boolean>;
//# sourceMappingURL=panel-css.d.ts.map