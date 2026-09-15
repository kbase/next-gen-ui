// What every store in the workbench is made of: a set of listeners, a notify
// loop, and a counter of changes.
//
// The contract, which is the whole reason there is one of these rather than
// one per store:
//   - a listener runs when the value changed and not when it did not, where
//     `equal` says what "changed" means;
//   - `version` counts changes, so a React reader can take it as its
//     `useSyncExternalStore` snapshot: a number, computed in constant time,
//     and a new one only when the data behind it moved;
//   - the listeners called for a change are those subscribed when it
//     happened. Unsubscribing from inside a notify means not being called for
//     that change; subscribing from inside one means waiting for the next.
//
// Three shapes, because the stores are three shapes. `createNotifier` is for
// a store that holds its state its own way — a registry with its own lookup
// rules, a query holding three fields under one version — and wants only the
// subscription side of this. `createStore` holds one value; `createKeyedStore`
// holds a map and can drop a key.

export interface Notifier {
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  // One change: bumps the version, then runs the listeners.
  changed: () => void;
}

export function createNotifier(): Notifier {
  const listeners = new Set<() => void>();
  let version = 0;
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
    changed() {
      version += 1;
      // Over a copy, skipping whoever has left since: a listener is never
      // called after its own unsubscribe has returned, and one that arrives
      // mid-loop is not called for a change it was not subscribed for.
      // Iterating the live set gives up the second of those.
      for (const listener of [...listeners]) if (listeners.has(listener)) listener();
    },
  };
}

export interface Store<T> {
  get: () => T;
  set: (value: T) => void;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

// One value. `equal` decides what a change is; identity by default, which is
// what a holder of a compound value gets right by replacing it rather than
// writing into it.
export function createStore<T>(initial: T, equal: (a: T, b: T) => boolean = Object.is): Store<T> {
  const { subscribe, version, changed } = createNotifier();
  let current = initial;
  return {
    get: () => current,
    set(value) {
      if (equal(current, value)) return;
      current = value;
      changed();
    },
    version,
    subscribe,
  };
}

// Whether an answer that arrives late is still wanted. A store that
// subscribes to a plugin and can be stopped, or can move on to another
// plugin, begins an epoch per subscription and asks the predicate it gets
// back before taking a push: a push after `stop`, or from a subscription
// that has been replaced, is not heard. Two stores had written this as a
// generation counter and as a live flag.
export interface Epoch {
  // Starts a new epoch, ending the one before; returns whether the new one
  // is still the current one.
  begin: () => () => boolean;
  // Ends the current epoch and starts none.
  end: () => void;
}

export function createEpoch(): Epoch {
  let current = 0;
  return {
    begin() {
      const mine = ++current;
      return () => mine === current;
    },
    end() {
      current += 1;
    },
  };
}

export interface KeyedStore<K, V> {
  get: (key: K) => V | undefined;
  has: (key: K) => boolean;
  set: (key: K, value: V) => void;
  // Drops the key. A key that was not held is not a change.
  forget: (key: K) => void;
  clear: () => void;
  // In insertion order, so a store whose order is meaningful — the cart's —
  // reads it straight off.
  entries: () => [K, V][];
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

export interface KeyedOptions<K, V> {
  initial?: Iterable<readonly [K, V]>;
  // Whether a value replacing one already under the key is a change. Identity
  // by default; a store whose values are rebuilt each time a panel renders
  // passes its own, or every render wakes every reader.
  equal?: (a: V, b: V) => boolean;
}

export function createKeyedStore<K, V>({
  initial,
  equal = Object.is,
}: KeyedOptions<K, V> = {}): KeyedStore<K, V> {
  const { subscribe, version, changed } = createNotifier();
  const held = new Map<K, V>(initial);
  return {
    get: (key) => held.get(key),
    has: (key) => held.has(key),
    set(key, value) {
      if (held.has(key) && equal(held.get(key)!, value)) return;
      held.set(key, value);
      changed();
    },
    forget(key) {
      if (held.delete(key)) changed();
    },
    clear() {
      if (held.size === 0) return;
      held.clear();
      changed();
    },
    entries: () => [...held.entries()],
    version,
    subscribe,
  };
}
