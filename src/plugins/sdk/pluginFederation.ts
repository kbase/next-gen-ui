import { federation } from '@module-federation/vite';
import { SHARED_SINGLETONS } from './shared';

export interface PluginFederationOptions {
  // The remote name. Must equal the manifest id.
  name: string;
  // The module whose default export is the definePlugin() result.
  entry?: string;
  // The module whose default export is the plugin's Matcher. Exposed apart
  // from `entry` because the host fetches it at startup: matching is
  // synchronous on every keystroke, so it cannot wait for the UI bundle.
  // Name it in the manifest as `entry.matcher`.
  matcher?: string;
}

// A plugin's vite.config: `plugins: [pluginFederation({ name: 'jobs' }), react()]`.
// Emits remoteEntry.js exposing `./plugin`, which the manifest's `entry`
// points at, and `./match` when the plugin has a matcher.
export function pluginFederation({
  name,
  entry = './src/plugin.tsx',
  matcher,
}: PluginFederationOptions) {
  return federation({
    name,
    filename: 'remoteEntry.js',
    manifest: true,
    exposes: { './plugin': entry, ...(matcher ? { './match': matcher } : {}) },
    shared: SHARED_SINGLETONS,
    dts: false,
  });
}
