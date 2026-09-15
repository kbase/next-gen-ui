// Everything that crosses between a plugin and the host is defined in
// `boundary/`, as a schema with the type inferred from it; this file adds
// what a plugin calls and what the host reads.
export * from './boundary';

export { PanelContext, usePanel, usePanelTitle, usePanelBreadcrumbs, usePanelTerms } from './hooks/usePanel';
export type { PanelHandle } from './hooks/usePanel';
export { HostContext, useHost } from './hooks/useHost';
export type { PluginHost } from './hooks/useHost';
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
export { AppFrame } from './components/AppFrame';
export type { AppFrameProps } from './components/AppFrame';
export type { FrameLayer } from './frames';
export { useCart } from './hooks/useCart';
export type { Cart } from './hooks/useCart';
export { CartButton } from './components/CartButton';
export type { CartButtonProps } from './components/CartButton';
