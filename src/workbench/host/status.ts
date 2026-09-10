import type { StatusItem } from '../../plugins/sdk';
import type { PluginId } from '../core';
import type { HostIndex } from './installed';

// What each plugin's `status()` last said. Polled, not pushed: the host asks
// at startup, once the background modules have arrived, and after every
// command, and the answer shows until the next ask.

export interface StatusStore {
  all: () => { plugin: PluginId; items: StatusItem[] }[];
  refresh: () => void;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createStatusStore(source: HostIndex): StatusStore {
  const current = new Map<PluginId, StatusItem[]>();
  const listeners = new Set<() => void>();
  let version = 0;
  return {
    all: () => [...current.entries()].map(([plugin, items]) => ({ plugin, items })),
    refresh() {
      let changed = false;
      for (const { plugin, background } of source.backgrounds()) {
        let items: StatusItem[] = [];
        try {
          items = background.status?.() ?? [];
        } catch (err) {
          console.warn(`plugin ${plugin}: its status() threw; showing nothing`, err);
        }
        if (JSON.stringify(current.get(plugin)) === JSON.stringify(items)) continue;
        if (items.length) current.set(plugin, items);
        else current.delete(plugin);
        changed = true;
      }
      if (!changed) return;
      version += 1;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
