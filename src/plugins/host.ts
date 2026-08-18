import { loadRemote, registerRemotes } from '@module-federation/runtime';

import type { PluginEntry } from './registry';
import { CONTRACT_VERSION, type Plugin } from './sdk';

// These globals act on the host the vite federation() plugin already
// initialized, which holds the shared-singleton scope. A fresh createInstance
// has none, so the plugin would bundle its own React.
const registered = new Set<string>();

/** Register a plugin's remote so `loadPlugin` can reach it. Idempotent. */
export function registerPlugin(entry: PluginEntry): void {
  registerRemotes([{ name: entry.id, entry: entry.manifestUrl }], {
    force: registered.has(entry.id),
  });
  registered.add(entry.id);
}

/** Load a registered plugin's `./Plugin` module, rejecting incompatible ones. */
export async function loadPlugin(id: string): Promise<Plugin> {
  const mod = await loadRemote<{ default: Plugin }>(`${id}/Plugin`);
  const plugin = mod?.default;
  if (!plugin?.Component) {
    throw new Error(`Plugin "${id}" exposed no valid ./Plugin module.`);
  }
  if (plugin.contractVersion !== CONTRACT_VERSION) {
    throw new Error(
      `Plugin "${id}" was built for plugin contract v${plugin.contractVersion ?? '?'}, ` +
        `but this app speaks v${CONTRACT_VERSION}.`,
    );
  }
  return plugin;
}
