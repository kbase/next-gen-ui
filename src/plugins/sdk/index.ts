// Everything that crosses between a plugin and the host is defined in
// `boundary/`, as a schema with the type inferred from it; this file adds
// what a plugin calls and what the host reads.
export * from './boundary';

export { PanelContext, usePanel, usePanelTitle, usePanelBreadcrumbs, usePanelTerms } from './usePanel';
export type { PanelHandle } from './usePanel';
export { HostContext, useHost } from './useHost';
export type { PluginHost } from './useHost';
export {
  SDK_VERSION,
  acceptsSdkVersion,
  MODULES,
  manifestFor,
  parseManifest,
  definePluginManifest,
  qualifyCommand,
  CONTEXT_TIERS,
} from './contract';
export {
  defineBackground,
  defineRoute,
  definePane,
  defineCommands,
  definePrompt,
  defineIntent,
} from './modules';
export type {
  Background,
  Route,
  Pane,
  Commands,
  Prompt,
  Intent,
  Modules,
  Mount,
  Cleanup,
  Subscribe,
  CommandContext,
  CommandHandler,
} from './modules';
export { fromReact } from './fromReact';
export { AppFrame } from './AppFrame';
export type { AppFrameProps } from './AppFrame';
export type { FrameLayer } from './frames';
export { useCart } from './useCart';
export type { Cart } from './useCart';
export { CartButton } from './CartButton';
export type { CartButtonProps } from './CartButton';
