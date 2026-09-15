import { describe, expect, it, vi } from 'vitest';
import { createCartStore, readCart } from './cart';
import type { StoredCartItem } from './cart';

const item = (id: string, over: Partial<StoredCartItem> = {}): StoredCartItem => ({
  id,
  plugin: 'function-junction',
  name: id,
  ...over,
});

describe('the cart', () => {
  it('is keyed on the id, so re-adding refreshes rather than duplicates', () => {
    const cart = createCartStore();
    cart.add(item('P0AEX9', { summary: 'first' }));
    cart.add(item('P0AEX9', { summary: 'second' }));
    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0].summary).toBe('second');
  });

  it('tells a subscriber when it changes, and not when it does not', () => {
    const cart = createCartStore([item('P0AEX9')]);
    const seen = vi.fn();
    cart.subscribe(seen);
    cart.remove('nothing-by-this-id');
    cart.clear();
    cart.clear();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('carries the context and the source through storage', () => {
    const full = item('P0AEX9', {
      context: { measuredOver: '8 phyla', reach: 'direct' },
      source: { command: 'open', args: { q: 'P0AEX9' } },
    });
    const back = readCart(
      JSON.stringify([full, item('fitness', { source: { command: 'fitness' } })]),
    );
    expect(back[0].context).toEqual({ measuredOver: '8 phyla', reach: 'direct' });
    expect(back[0].source).toEqual({ command: 'open', args: { q: 'P0AEX9' } });
    expect(back[1].source).toEqual({ command: 'fitness' });
  });

  // The stored item is the SDK's without `answers`: a plugin's item says which
  // of the terms a question carried it answered, and the cart asks nothing. An
  // item added straight off a Related row brings one, and it is dropped rather
  // than treated as damage — the thing is still a thing, the reason is not.
  it('reads an item that arrived with its evidence, and stores it without', () => {
    const offered = {
      ...item('gk:genome:511145'),
      answers: [{ term: 'ncbitaxon:562', kind: 'record' }],
    };
    const back = readCart(JSON.stringify([offered]));
    expect(back).toHaveLength(1);
    expect(back[0]).not.toHaveProperty('answers');
  });

  it('treats unreadable storage as an empty cart', () => {
    expect(readCart('not json')).toEqual([]);
    expect(readCart(null)).toEqual([]);
    expect(readCart('{"not":"an array"}')).toEqual([]);
    expect(readCart(JSON.stringify([item('good'), { id: 'bad' }]))).toEqual([]);
  });

  // The key carries the shape, so a document written by a build whose items
  // pointed back with a path is never read under this one — but were the key
  // to be reused, a path source is damage and the cart comes back empty
  // rather than holding an item with no way back.
  it('discards a cart whose items point back with a path', () => {
    const stored = [
      { id: 'P0AEX9', plugin: 'function-junction', name: 'SecA', source: { path: '/?q=P0AEX9' } },
    ];
    expect(readCart(JSON.stringify(stored))).toEqual([]);
  });
});
