import { federation } from '@module-federation/vite';

import { SHARED_SINGLETONS } from './shared';

// A plugin's vite.config is `plugins: [pluginFederation({ name }), react()]`.
export function pluginFederation({ name, plugin = './src/Plugin.tsx' }: PluginFederationOptions) {
  return federation({
    name,
    filename: 'remoteEntry.js',
    manifest: true,
    exposes: { './Plugin': plugin },
    shared: SHARED_SINGLETONS,
    dts: false, // host loads via loadRemote; remote .d.ts are never consumed
  });
}

export interface PluginFederationOptions {
  /** Remote name — must equal the plugin's registry id and its URL segment. */
  name: string;
  /** Path to the module exposed as `./Plugin`. Defaults to `./src/Plugin.tsx`. */
  plugin?: string;
}
