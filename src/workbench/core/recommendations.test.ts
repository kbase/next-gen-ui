import { describe, expect, it } from 'vitest';
import type { CartItem } from '../../plugins/sdk';
import type { SourceState } from './query';
import { mergeRecommendations, unionAnswers } from './recommendations';

const item = (id: string): CartItem => ({ id, name: id });
// The same item, said to answer these terms: what a plugin returns when it
// looked the thing up rather than recognising a string.
const answering = (id: string, ...terms: string[]): CartItem => ({
  ...item(id),
  answers: terms.map((term) => ({ term, kind: 'record' as const })),
});
const state = (
  answers: { plugin: string; items: (string | CartItem)[] }[],
  pending: string[] = [],
): SourceState => ({
  label: '',
  pool: [],
  answers: answers.map((a) => ({
    plugin: a.plugin,
    items: a.items.map((i) => (typeof i === 'string' ? item(i) : i)),
  })),
  pending,
  loading: pending.length > 0,
});

// The rule both merges call: `mergeRecommendations` for two items in one
// round, the query runner for two rounds about a pool that grew.
describe('unionAnswers', () => {
  it('keeps the first mention of a term, so a later answer cannot weaken it', () => {
    expect(
      unionAnswers(
        [{ term: 'uniprot:P11558', kind: 'record' }],
        [
          { term: 'uniprot:P11558', kind: 'name' },
          { term: 'ncbitaxon:562', kind: 'record' },
        ],
      ),
    ).toEqual([
      { term: 'uniprot:P11558', kind: 'record' },
      { term: 'ncbitaxon:562', kind: 'record' },
    ]);
  });

  it('is the other list when either side has none', () => {
    const answers = [{ term: 'ncbitaxon:562', kind: 'record' as const }];
    expect(unionAnswers(undefined, answers)).toEqual(answers);
    expect(unionAnswers(answers, undefined)).toEqual(answers);
    expect(unionAnswers()).toEqual([]);
  });
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
      { plugin: 'gk', source: 'page', answers: [] },
      { plugin: 'fj', source: 'cart', answers: [] },
    ]);
  });

  // The row's sentence is built from these: one plugin's terms must not end
  // up in another's clause, or the row says P11558 was genKnown's reason when
  // it was Function Junction's.
  it('keeps each offer’s own terms when two plugins answer with the same item', () => {
    const rows = mergeRecommendations(
      [],
      [
        {
          source: 'cart',
          state: state([
            { plugin: 'gk', items: [answering('a', 'ncbitaxon:562')] },
            { plugin: 'fj', items: [answering('a', 'uniprot:P11558')] },
          ]),
        },
      ],
    );
    expect(rows[0].offeredBy).toEqual([
      { plugin: 'gk', source: 'cart', answers: [{ term: 'ncbitaxon:562', kind: 'record' }] },
      { plugin: 'fj', source: 'cart', answers: [{ term: 'uniprot:P11558', kind: 'record' }] },
    ]);
  });

  it('unions the terms when one plugin answers one source twice with the same item', () => {
    const rows = mergeRecommendations(
      [],
      [
        {
          source: 'cart',
          state: state([
            {
              plugin: 'gk',
              items: [answering('a', 'ncbitaxon:562'), answering('a', 'insdc.gcf:GCF_000005845.2')],
            },
          ]),
        },
      ],
    );
    expect(rows[0].offeredBy).toEqual([
      {
        plugin: 'gk',
        source: 'cart',
        answers: [
          { term: 'ncbitaxon:562', kind: 'record' },
          { term: 'insdc.gcf:GCF_000005845.2', kind: 'record' },
        ],
      },
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
