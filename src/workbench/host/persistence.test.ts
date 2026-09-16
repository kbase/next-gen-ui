import { describe, expect, it } from 'vitest';
import type { StoredCartItem } from '../core';
import { CART_STORAGE_KEY, defaultLayout, serialize } from '../core';
import { LAYOUT_STORAGE_KEY, PLUGINS_STORAGE_KEY, loadWorkbench } from './persistence';
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

const item: StoredCartItem = { id: 'gk:P0AEX9', plugin: 'gk', name: 'SecA' };
const url = 'http://plugins.test/services/hello/manifest.json';

describe('loading a workbench from storage', () => {
  it('has nothing for a first visit', async () => {
    const { loaded } = await loadWorkbench(memoryStorage());
    expect(loaded).toEqual({ layout: null, cart: [], settings: null, plugins: null });
  });

  it('returns each document it can read', async () => {
    const layout = defaultLayout({ pinned: ['jobs'] });
    const { loaded } = await loadWorkbench(
      memoryStorage({
        [LAYOUT_STORAGE_KEY]: serialize(layout),
        [CART_STORAGE_KEY]: JSON.stringify([item]),
        [SETTINGS_STORAGE_KEY]: JSON.stringify({
          assistant: 'koros',
          intent: 'intent',
          keybindings: { 'Ctrl+Z': '' },
        }),
        [PLUGINS_STORAGE_KEY]: JSON.stringify([url]),
      }),
    );
    expect(loaded).toEqual({
      layout,
      cart: [item],
      settings: { assistant: 'koros', intent: 'intent', keybindings: { 'Ctrl+Z': '' } },
      plugins: [url],
    });
  });

  it.each([
    ['unparseable', '{not json'],
    ['not a list', '{"url":"x"}'],
    ['a list holding something that is not a URL string', '[5]'],
  ])('loads no plugin list from %s', async (_case, text) => {
    const { loaded } = await loadWorkbench(memoryStorage({ [PLUGINS_STORAGE_KEY]: text }));
    expect(loaded.plugins).toBeNull();
  });

  it.each([
    ['unparseable', '{not json'],
    ['a shape the schema refuses', '{"main":"not a node"}'],
    ['a tree that breaks a structural rule', JSON.stringify({ ...defaultLayout(), focus: 'gone' })],
  ])('loads no layout at all from %s', async (_case, text) => {
    const { loaded } = await loadWorkbench(memoryStorage({ [LAYOUT_STORAGE_KEY]: text }));
    expect(loaded.layout).toBeNull();
  });

  it.each([
    ['a field of the wrong type', '{"assistant":5}'],
    // What the previous shape's documents look like, in case one is ever read
    // under this key: settings are defaults again, not half-loaded. A null
    // assistant is what "None" used to be saved as, and the whole document
    // goes rather than the workbench starting with no assistant chosen.
    ['a field the shape has since gained', '{"assistant":"koros","intent":"intent"}'],
    ['a null where a plugin id belongs', '{"assistant":null,"intent":null,"keybindings":{}}'],
  ])('loads no settings from a stored copy with %s', async (_case, text) => {
    const { loaded } = await loadWorkbench(memoryStorage({ [SETTINGS_STORAGE_KEY]: text }));
    expect(loaded.settings).toBeNull();
  });

  it('loads nothing from a storage that refuses to be read', async () => {
    const { loaded } = await loadWorkbench(refusing('getItem'));
    expect(loaded).toEqual({ layout: null, cart: [], settings: null, plugins: null });
  });
});

describe('saving a workbench to storage', () => {
  it('writes each kind where the next load will find it', async () => {
    const storage = memoryStorage();
    const layout = defaultLayout({ pinned: ['koros'] });
    const { save } = await loadWorkbench(storage);
    save('layout', layout);
    save('cart', [item]);
    const settings = {
      assistant: 'koros',
      intent: 'intent',
      keybindings: { 'Ctrl+Y': 'workbench:redo', 'Ctrl+Shift+Z': '' },
    };
    save('settings', settings);
    save('plugins', [url]);
    const { loaded } = await loadWorkbench(storage);
    expect(loaded).toEqual({ layout, cart: [item], settings, plugins: [url] });
  });

  it('is a no-op, not an error, when the browser refuses the write', async () => {
    const { save } = await loadWorkbench(refusing('setItem'));
    expect(() => save('layout', defaultLayout())).not.toThrow();
  });
});
