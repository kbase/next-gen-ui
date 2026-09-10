import type { PluginConfig } from '../../plugins/sdk';
import { MODULES, manifestFor } from '../../plugins/sdk';
import type { InstalledPlugin, ModuleLoaders } from './installed';

// A plugin bundled with the host. The build's rule — a module exists iff
// the config names it — applied at the other naming site: the loaders given
// here are the manifest's `modules`. What the build would write for a
// remote, computed here.
export function localPlugin({
  config,
  ...loaders
}: { config: PluginConfig } & ModuleLoaders): InstalledPlugin {
  return {
    manifest: manifestFor(
      config,
      MODULES.filter((kind) => loaders[kind] !== undefined),
    ),
    modules: loaders,
  };
}
