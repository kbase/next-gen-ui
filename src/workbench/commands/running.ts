import { createKeyedStore } from '../core/subscribable';

// Which commands are running, by qualified name, so the control that invoked
// one can show itself busy until the handler settles.

export interface RunStore {
  start: (name: string) => void;
  end: (name: string) => void;
  running: (name: string) => boolean;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createRunStore(): RunStore {
  // A count rather than a flag: the same command run twice from two controls
  // stops being busy when the second one settles, not the first.
  const counts = createKeyedStore<string, number>();
  return {
    start(name) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    },
    end(name) {
      const left = (counts.get(name) ?? 1) - 1;
      if (left > 0) counts.set(name, left);
      else counts.forget(name);
    },
    running: counts.has,
    subscribe: counts.subscribe,
    version: counts.version,
  };
}
