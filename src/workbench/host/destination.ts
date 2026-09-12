import type { Cleanup, Destination } from '../../plugins/sdk';
import type { PluginId } from '../core';
import type { HostIndex } from './installed';
import type { SettingsStore } from './settings';

// Where the assistant says the next message lands. The plugin pushes it —
// `destination(set)` calls `set` as it subscribes and again on every move —
// and the value is held here rather than in the prompt bar, so the bar
// draws the row from a value it already has instead of mounting, finding
// nothing, and being repaired. The same shape as `status.ts`, for the same
// reason: the plugin's push is the change detection, and React reads a
// version.
//
// The destination belongs to the plugin that pushed it. Choosing another
// assistant ends that plugin's subscription and drops the value, so the
// bar shows the new assistant's own destination, or New conversation until
// it pushes one; the previous one is never shown under the new name.

export interface DestinationStore {
  get: () => Destination | null;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  // Ends the plugin's subscription and drops the value. A push that arrives
  // after this is ignored.
  stop: () => void;
}

export function createDestinationStore(
  source: HostIndex,
  settings: SettingsStore,
): DestinationStore {
  const listeners = new Set<() => void>();
  let current: Destination | null = null;
  let version = 0;
  let live = true;
  // The assistant being followed, the call that ends its subscription, and
  // a count that makes every push from an earlier one stale — a module that
  // loads after the user has moved on must not subscribe, and a plugin that
  // pushes after its cleanup must not be heard.
  let followed: PluginId | null = null;
  let stopPlugin: Cleanup = () => {};
  let generation = 0;

  const changed = () => {
    version += 1;
    listeners.forEach((l) => l());
  };

  const release = () => {
    generation += 1;
    const [was, stop] = [followed, stopPlugin];
    followed = null;
    stopPlugin = () => {};
    try {
      stop();
    } catch (err) {
      console.warn(`plugin ${was}: its destination cleanup threw`, err);
    }
    if (current === null) return;
    current = null;
    changed();
  };

  // The prompt module is fetched here, not by the bar: what the bar shows
  // has to be subscribed to before it renders, and Settings naming the
  // plugin is what says a subscription is wanted.
  const follow = () => {
    if (!live) return;
    const assistant = settings.get().assistant;
    if (assistant === followed) return;
    release();
    if (!assistant || !source.has(assistant, 'prompt')) return;
    followed = assistant;
    const mine = ++generation;
    source
      .module(assistant, 'prompt')
      .then((prompt) => {
        if (mine !== generation || !prompt.destination) return;
        stopPlugin = prompt.destination((value) => {
          if (mine !== generation) return;
          current = value;
          changed();
        });
      })
      .catch((err: unknown) => {
        console.warn(`plugin ${assistant}: its prompt module failed to load; no destination`, err);
      });
  };

  const unwatch = settings.subscribe(follow);
  follow();

  return {
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
    stop() {
      if (!live) return;
      live = false;
      unwatch();
      release();
    },
  };
}
