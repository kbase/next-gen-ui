import { describe, expect, it } from 'vitest';
import { defaultLayout, makeRoute } from './layout';
import { reduce } from './reduce';
import { deserialize, serialize } from './serialize';

const fallback = () => defaultLayout({ pinned: ['koros'] });

// No field is defaulted, so a layout written before a field existed is a
// parse failure, not a partial restore. The storage key carries the shape.
function withoutLocked(): unknown {
  const rest: Record<string, unknown> = { ...defaultLayout() };
  delete rest.locked;
  return rest;
}

describe('deserialize', () => {
  it('round-trips a layout', () => {
    const layout = reduce(defaultLayout({ pinned: ['jobs'] }), {
      type: 'open',
      panel: makeRoute('koros', '/x', 'k'),
    });
    expect(deserialize(serialize(layout), fallback)).toEqual(layout);
  });

  it.each([
    ['nothing', null],
    ['not json', '{'],
    ['a document missing a field the schema requires', JSON.stringify(withoutLocked())],
    [
      'a tab without a panel',
      JSON.stringify({
        ...defaultLayout(),
        main: { kind: 'group', id: 'root', tabs: ['ghost/route#1'], active: 'ghost/route#1' },
      }),
    ],
  ])('falls back to the default on %s', (_label, text) => {
    expect(deserialize(text, fallback)).toEqual(fallback());
  });
});
