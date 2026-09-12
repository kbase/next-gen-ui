import { describe, expect, it } from 'vitest';
import type { CartItem } from '../core';
import { CART_STORAGE_KEY, defaultLayout, serialize } from '../core';
import { LAYOUT_STORAGE_KEY, loadWorkbench } from './persistence';
import { SETTINGS_STORAGE_KEY } from './settings';

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

function refusing(op: 'getItem' | 'setItem'): Storage {
  const storage = memoryStorage();
  return {
    ...storage,
    [op]: () => {
      throw new DOMException('denied', 'SecurityError');
    },
  };
}

const item: CartItem = { id: 'gk:P0AEX9', plugin: 'gk', name: 'SecA', addedAt: 1 };

describe('loading a workbench from storage', () => {
  it('has nothing for a first visit', async () => {
    const { loaded } = await loadWorkbench(memoryStorage());
    expect(loaded).toEqual({ layout: null, cart: [], settings: null });
  });

  it('returns each document it can read', async () => {
    const layout = defaultLayout({ pinned: ['jobs'] });
    const { loaded } = await loadWorkbench(
      memoryStorage({
        [LAYOUT_STORAGE_KEY]: serialize(layout),
        [CART_STORAGE_KEY]: JSON.stringify([item]),
        [SETTINGS_STORAGE_KEY]: JSON.stringify({ assistant: 'koros', intent: null }),
      }),
    );
    expect(loaded).toEqual({
      layout,
      cart: [item],
      settings: { assistant: 'koros', intent: null },
    });
  });

  it.each([
    ['unparseable', '{not json'],
    ['a shape the schema refuses', '{"main":"not a node"}'],
    ['a tree that breaks a structural rule', JSON.stringify({ ...defaultLayout(), focus: 'gone' })],
  ])('loads no layout at all from %s', async (_case, text) => {
    const { loaded } = await loadWorkbench(memoryStorage({ [LAYOUT_STORAGE_KEY]: text }));
    expect(loaded.layout).toBeNull();
  });

  it('loads no settings from a stored copy that does not match the schema', async () => {
    const { loaded } = await loadWorkbench(
      memoryStorage({ [SETTINGS_STORAGE_KEY]: '{"assistant":5}' }),
    );
    expect(loaded.settings).toBeNull();
  });

  it('loads nothing from a storage that refuses to be read', async () => {
    const { loaded } = await loadWorkbench(refusing('getItem'));
    expect(loaded).toEqual({ layout: null, cart: [], settings: null });
  });
});

describe('saving a workbench to storage', () => {
  it('writes each kind where the next load will find it', async () => {
    const storage = memoryStorage();
    const layout = defaultLayout({ pinned: ['koros'] });
    const { save } = await loadWorkbench(storage);
    save('layout', layout);
    save('cart', [item]);
    save('settings', { assistant: null, intent: 'intent' });
    const { loaded } = await loadWorkbench(storage);
    expect(loaded).toEqual({
      layout,
      cart: [item],
      settings: { assistant: null, intent: 'intent' },
    });
  });

  it('is a no-op, not an error, when the browser refuses the write', async () => {
    const { save } = await loadWorkbench(refusing('setItem'));
    expect(() => save('layout', defaultLayout())).not.toThrow();
  });
});
