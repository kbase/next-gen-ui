import { describe, expect, it } from 'vitest';
import { defaultLayout, makeRoute } from './layout';
import { reduce } from './reduce';
import { deserialize, introduce, serialize } from './serialize';
import type { Layout } from './layout';

const fallback = () => defaultLayout({ pinned: ['koros'] });

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
    ['an earlier version', JSON.stringify({ ...defaultLayout(), version: 1 })],
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

describe('introducing a host block to an existing layout', () => {
  const saved = (over: Partial<Layout> = {}): Layout => ({
    ...defaultLayout({ pinned: ['koros'] }),
    introduced: ['koros'],
    ...over,
  });

  // The case that made this necessary: a block added to the host after
  // someone's layout was saved is invisible to them, because the saved layout
  // is restored verbatim and defaultPinned only builds a fresh one.
  it('pins a block the layout has never been offered', () => {
    const next = introduce(saved(), ['koros', 'related']);
    expect(next.sidebar.pinned).toEqual(['koros', 'related']);
    expect(next.introduced).toContain('related');
  });

  it('leaves a block the user unpinned alone', () => {
    const once = introduce(saved(), ['koros', 'related']);
    const unpinned: Layout = {
      ...once,
      sidebar: { ...once.sidebar, pinned: once.sidebar.pinned.filter((p) => p !== 'related') },
    };
    expect(introduce(unpinned, ['koros', 'related']).sidebar.pinned).not.toContain('related');
  });

  it('changes nothing when there is nothing new', () => {
    const layout = saved();
    expect(introduce(layout, ['koros'])).toBe(layout);
  });
});
