import { describe, expect, it, vi } from 'vitest';
import { createKeyedStore, createNotifier, createStore } from './subscribable';

describe('a store', () => {
  it('wakes a listener when the value changed and not when it did not', () => {
    const store = createStore('a');
    const seen = vi.fn();
    store.subscribe(seen);
    store.set('a');
    expect(seen).not.toHaveBeenCalled();
    store.set('b');
    expect(seen).toHaveBeenCalledTimes(1);
  });

  // What `useSyncExternalStore` is handed as its snapshot: a reader that
  // compares versions must never see a new one for a change that did not
  // happen, or every keystroke elsewhere re-renders it.
  it('counts changes and only changes', () => {
    const store = createStore(0);
    store.set(1);
    store.set(1);
    store.set(2);
    expect(store.version()).toBe(2);
  });

  it('compares with the equality it was given', () => {
    const store = createStore<string[]>([], (a, b) => a.join() === b.join());
    const seen = vi.fn();
    store.subscribe(seen);
    store.set(['x']);
    store.set(['x']);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('stops calling a listener that unsubscribed', () => {
    const store = createStore('a');
    const seen = vi.fn();
    const off = store.subscribe(seen);
    store.set('b');
    off();
    store.set('c');
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

// One change, one set of listeners: whoever was subscribed when it happened.
// A React root unsubscribing on unmount is the case — a listener that has
// already been let go must not be called by a notify already under way, and
// one that subscribes while a notify runs is subscribed for what comes next,
// not for what is in progress.
describe('a notify already under way', () => {
  it('skips a listener another one unsubscribed before its turn', () => {
    const notifier = createNotifier();
    const second = vi.fn();
    let off = () => {};
    notifier.subscribe(() => off());
    off = notifier.subscribe(second);
    notifier.changed();
    expect(second).not.toHaveBeenCalled();
  });

  it('leaves a listener that subscribed during it to the next change', () => {
    const notifier = createNotifier();
    const late = vi.fn();
    let subscribed = false;
    notifier.subscribe(() => {
      if (subscribed) return;
      subscribed = true;
      notifier.subscribe(late);
    });
    notifier.changed();
    expect(late).not.toHaveBeenCalled();
    notifier.changed();
    expect(late).toHaveBeenCalledTimes(1);
  });
});

describe('a keyed store', () => {
  it('drops the key rather than holding it empty', () => {
    const store = createKeyedStore<string, number>();
    store.set('a', 1);
    store.set('b', 2);
    store.forget('a');
    expect(store.entries()).toEqual([['b', 2]]);
    expect(store.size()).toBe(1);
    expect(store.has('a')).toBe(false);
  });

  it('is unchanged by forgetting a key it never held', () => {
    const store = createKeyedStore<string, number>();
    const seen = vi.fn();
    store.subscribe(seen);
    store.forget('a');
    store.clear();
    expect(seen).not.toHaveBeenCalled();
    expect(store.version()).toBe(0);
  });

  it('compares values under one key with the given equal', () => {
    const store = createKeyedStore<string, string[]>({ equal: (a, b) => a.join() === b.join() });
    const seen = vi.fn();
    store.subscribe(seen);
    store.set('p', ['one']);
    store.set('p', ['one']);
    store.set('q', ['one']);
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it('keeps the order keys were first given, across a replacement', () => {
    const store = createKeyedStore<string, number>({
      initial: [
        ['a', 1],
        ['b', 2],
      ],
    });
    store.set('a', 9);
    expect(store.entries().map(([key]) => key)).toEqual(['a', 'b']);
  });
});
