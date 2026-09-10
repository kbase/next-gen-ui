import { describe, expect, it } from 'vitest';
import { defaultLayout, makePane, makeRoute, paneId } from './layout';
import { validate } from './serialize';

describe('panel identity', () => {
  it('a pane has one fixed id per plugin', () => {
    expect(paneId('jobs')).toBe('jobs/pane');
    expect(makePane('jobs')).toEqual({ id: 'jobs/pane', plugin: 'jobs', kind: 'pane', path: '' });
  });

  it('a route panel is named by the key it was opened with, not by its path', () => {
    const a = makeRoute('data', '/1/2/3', 'k1');
    const b = makeRoute('data', '/1/2/3', 'k2');
    expect(a.id).not.toBe(b.id);
    expect(a.path).toBe('/1/2/3');
    expect(a.id.startsWith('data/route#')).toBe(true);
  });
});

describe('defaultLayout', () => {
  it('pins the given plugins and gives each a pane', () => {
    const layout = defaultLayout({ pinned: ['koros', 'data'] });
    expect(layout.sidebar.pinned).toEqual(['koros', 'data']);
    expect(Object.keys(layout.panels)).toEqual(['koros/pane', 'data/pane']);
    expect(validate(layout)).toEqual([]);
  });
});
