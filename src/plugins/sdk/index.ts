// Runtime surface for plugin authors. Build-time pieces (pluginFederation,
// SHARED_SINGLETONS) are imported from their own modules, NOT re-exported here:
// re-exporting would drag @module-federation/vite and package.json into the
// runtime bundle.
export { CONTRACT_VERSION } from './contract';
export type { PluginProps, Plugin } from './contract';
export { definePlugin } from './definePlugin';
