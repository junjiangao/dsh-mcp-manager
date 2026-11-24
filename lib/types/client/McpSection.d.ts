/** Settings → MCP: one page over the official entries and every file scope. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ManagerStore } from './manager-store.ts';
/** What the section registration injects. */
export interface McpSectionInjected {
    readonly store: ManagerStore;
}
export type McpSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.mcpManager'> & InjectFace<McpSectionInjected>;
export declare function McpSection(props: McpSectionProps): import("react").JSX.Element;
//# sourceMappingURL=McpSection.d.ts.map