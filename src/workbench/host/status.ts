import type { Cleanup, StatusItem } from '@kbase/plugin-sdk';
import { StatusItemSchema } from '@kbase/plugin-sdk';
import type { PluginId } from '../core';
import { createEpoch, createKeyedStore } from '../core/subscribable';
import { accepted } from './checked';
import type { HostIndex } from './installed';

// What each plugin last pushed for the status bar. Every background's
// `status` is subscribed to as its module arrives, and the plugin pushes:
// a line that waits on a server reaches the bar when it lands rather than
// when the next command runs. A plugin that never calls `set` has no entry
// and contributes no line.

export interface StatusStore {
  all: () => { plugin: PluginId; items: StatusItem[] }[];
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  // Ends every plugin's subscription and drops what they pushed. A push
  // that arrives after this is ignored, so a plugin whose cleanup misses a
  // request already in flight cannot write to a store no one is reading.
  stop: () => void;
}

export function createStatusStore(source: HostIndex): StatusStore {
  const current = createKeyedStore<PluginId, StatusItem[]>();
  const stops = new Map<PluginId, Cleanup>();
  // One epoch for the store's life: `stop` ends it, and a push after that —
  // a plugin whose cleanup missed a request in flight — is not heard.
  const epoch = createEpoch();
  const live = epoch.begin();

  // Subscribes to each background that has arrived and is not subscribed to
  // yet. The plugin is entered in `stops` before `status` is called, because
  // a plugin that throws on subscribe must not be called again every time
  // another module loads.
  const attach = () => {
    if (!live()) return;
    for (const { plugin, background } of source.backgrounds()) {
      if (!background.status || stops.has(plugin)) continue;
      stops.set(plugin, () => {});
      try {
        stops.set(
          plugin,
          background.status((pushed) => {
            if (!live()) return;
            const items = accepted(`plugin ${plugin}`, 'a status line it pushed', StatusItemSchema, pushed);
            if (items.length) current.set(plugin, items);
            else current.forget(plugin);
          }),
        );
      } catch (err) {
        console.warn(`plugin ${plugin}: its status subscription threw; showing nothing`, err);
      }
    }
  };

  const unwatch = source.subscribe(attach);
  attach();

  return {
    all: () => current.entries().map(([plugin, items]) => ({ plugin, items })),
    subscribe: current.subscribe,
    version: current.version,
    stop() {
      if (!live()) return;
      epoch.end();
      unwatch();
      for (const [plugin, stop] of stops) {
        try {
          stop();
        } catch (err) {
          console.warn(`plugin ${plugin}: its status cleanup threw`, err);
        }
      }
      stops.clear();
      current.clear();
    },
  };
}
