import { describe, expect, it } from 'vitest';
import { defaultLayout, makePanel } from './layout';
import { reduce } from './reduce';
import { deserialize, serialize } from './serialize';

const fallback = () => defaultLayout({ pinned: ['koros'] });

describe('deserialize', () => {
  it('round-trips a layout', () => {
    const layout = reduce(defaultLayout({ pinned: ['jobs'] }), {
      type: 'open',
      panel: makePanel('koros', 'document', { slug: 'x' }),
    });
    expect(deserialize(serialize(layout), fallback)).toEqual(layout);
  });

  it.each([
    ['nothing', null],
    ['not json', '{'],
    ['wrong version', JSON.stringify({ ...defaultLayout(), version: 2 })],
    [
      'a tab without a panel',
      JSON.stringify({
        ...defaultLayout(),
        main: { kind: 'group', id: 'root', tabs: ['ghost/document'], active: 'ghost/document' },
      }),
    ],
  ])('falls back to the default on %s', (_label, text) => {
    expect(deserialize(text, fallback)).toEqual(fallback());
  });
});
