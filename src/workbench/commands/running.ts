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
  const counts = new Map<string, number>();
  const listeners = new Set<() => void>();
  let version = 0;
  const changed = () => {
    version += 1;
    listeners.forEach((l) => l());
  };
  return {
    start(name) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
      changed();
    },
    end(name) {
      const left = (counts.get(name) ?? 1) - 1;
      if (left > 0) counts.set(name, left);
      else counts.delete(name);
      changed();
    },
    running: (name) => counts.has(name),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
