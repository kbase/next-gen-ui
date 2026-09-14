import type { Cleanup, Destination } from '../../plugins/sdk';
import { DestinationSchema } from '../../plugins/sdk';
import type { PluginId } from '../core';
import { createEpoch, createStore } from '../core/subscribable';
import { issueText } from './checked';
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
  const current = createStore<Destination | null>(null);
  // The assistant being followed and the call that ends its subscription.
  // Each follow is an epoch: a module that loads after the user has moved
  // on must not subscribe, and a plugin that pushes after its cleanup must
  // not be heard.
  let followed: PluginId | null = null;
  let stopPlugin: Cleanup = () => {};
  const epoch = createEpoch();

  const release = () => {
    epoch.end();
    const [was, stop] = [followed, stopPlugin];
    followed = null;
    stopPlugin = () => {};
    try {
      stop();
    } catch (err) {
      console.warn(`plugin ${was}: its destination cleanup threw`, err);
    }
    current.set(null);
  };

  // The prompt module is fetched here, not by the bar: what the bar shows
  // has to be subscribed to before it renders, and Settings naming the
  // plugin is what says a subscription is wanted.
  const follow = () => {
    const assistant = settings.get().assistant;
    if (assistant === followed) return;
    release();
    if (!source.has(assistant, 'prompt')) return;
    followed = assistant;
    const still = epoch.begin();
    source
      .module(assistant, 'prompt')
      .then((prompt) => {
        if (!still() || !prompt.destination) return;
        stopPlugin = prompt.destination((value) => {
          if (!still()) return;
          if (value === null) {
            current.set(null);
            return;
          }
          const parsed = DestinationSchema.safeParse(value);
          if (!parsed.success) {
            console.warn(
              `plugin ${assistant}: the destination it pushed — ${issueText(parsed.error.issues)}; ignoring it`,
            );
            return;
          }
          current.set(parsed.data);
        });
      })
      .catch((err: unknown) => {
        console.warn(`plugin ${assistant}: its prompt module failed to load; no destination`, err);
      });
  };

  const unwatch = settings.subscribe(follow);
  follow();

  return {
    get: current.get,
    subscribe: current.subscribe,
    version: current.version,
    // Nothing calls `follow` once the settings subscription is gone.
    stop() {
      unwatch();
      release();
    },
  };
}
