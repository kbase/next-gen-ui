import { describe, expect, it } from 'vitest';
import type { CartItem } from '../../plugins/sdk';
import type { SourceState } from './query';
import { mergeRecommendations } from './recommendations';

const item = (id: string): CartItem => ({ id, name: id });
const state = (
  answers: { plugin: string; items: string[] }[],
  pending: string[] = [],
): SourceState => ({
  label: '',
  pool: [],
  answers: answers.map((a) => ({ plugin: a.plugin, commands: [], cartItems: a.items.map(item) })),
  pending,
  loading: pending.length > 0,
});

describe('mergeRecommendations', () => {
  it('keeps the order rows first appeared in, and appends new ones', () => {
    const first = mergeRecommendations(
      [],
      [{ source: 'page', state: state([{ plugin: 'gk', items: ['a', 'b'] }]) }],
    );
    expect(first.map((r) => r.id)).toEqual(['a', 'b']);
    const second = mergeRecommendations(first, [
      { source: 'page', state: state([{ plugin: 'gk', items: ['c', 'b', 'a'] }]) },
    ]);
    expect(second.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('merges the same item from two sources into one row with both offers', () => {
    const rows = mergeRecommendations(
      [],
      [
        { source: 'page', state: state([{ plugin: 'gk', items: ['a'] }]) },
        { source: 'cart', state: state([{ plugin: 'fj', items: ['a'] }]) },
      ],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].offeredBy).toEqual([
      { plugin: 'gk', source: 'page' },
      { plugin: 'fj', source: 'cart' },
    ]);
  });

  it('keeps a row while the source that offered it is still asking, and drops it once that settles', () => {
    const before = mergeRecommendations(
      [],
      [{ source: 'page', state: state([{ plugin: 'gk', items: ['a'] }]) }],
    );
    const asking = mergeRecommendations(before, [{ source: 'page', state: state([], ['gk']) }]);
    expect(asking.map((r) => r.id)).toEqual(['a']);
    const settled = mergeRecommendations(asking, [{ source: 'page', state: state([]) }]);
    expect(settled).toEqual([]);
  });
});
