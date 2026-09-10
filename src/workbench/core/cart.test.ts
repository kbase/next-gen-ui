import { describe, expect, it, vi } from 'vitest';
import { createCartStore, readCart } from './cart';
import type { CartItem } from './cart';

const item = (id: string, over: Partial<CartItem> = {}): CartItem => ({
  id,
  plugin: 'function-junction',
  name: id,
  addedAt: 1,
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
      source: { path: '/P0AEX9' },
    });
    const made = item('fitness', { source: { command: 'fitness', args: { acc: 'P0AEX9' } } });
    const back = readCart(JSON.stringify([full, made]));
    expect(back[0].context).toEqual({ measuredOver: '8 phyla', reach: 'direct' });
    expect(back[0].source).toEqual({ path: '/P0AEX9' });
    expect(back[1].source).toEqual({ command: 'fitness', args: { acc: 'P0AEX9' } });
  });

  // One item written by an older build should cost the user that item, not the
  // cart: a session restore is exactly when a person has least patience for
  // losing what they collected.
  it('keeps the readable items when one is corrupt', () => {
    const raw = JSON.stringify([item('good'), { id: 'bad' }, item('also-good')]);
    expect(readCart(raw).map((i) => i.id)).toEqual(['good', 'also-good']);
  });

  it('treats unreadable storage as an empty cart', () => {
    expect(readCart('not json')).toEqual([]);
    expect(readCart(null)).toEqual([]);
    expect(readCart('{"not":"an array"}')).toEqual([]);
  });
});
