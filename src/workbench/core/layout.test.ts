import { describe, expect, it } from 'vitest';
import { defaultLayout, makePanel, panelId } from './layout';
import { validate } from './serialize';

describe('panel identity', () => {
  it('is the type alone when there are no params', () => {
    expect(panelId('jobs', 'navigator')).toBe('jobs/navigator');
  });

  it('sorts params so key order does not split one resource into two panels', () => {
    expect(panelId('koros', 'document', { b: '2', a: '1' })).toBe(
      panelId('koros', 'document', { a: '1', b: '2' }),
    );
  });

  it('escapes params that look like separators', () => {
    const id = panelId('data', 'document', { ref: '1/2/3' });
    expect(id).toBe('data/document?ref=1%2F2%2F3');
    expect(makePanel('data', 'document', { ref: '1/2/3' }).params).toEqual({ ref: '1/2/3' });
  });
});

describe('defaultLayout', () => {
  it('pins the given plugins and gives each a navigator panel', () => {
    const layout = defaultLayout({ pinned: ['koros', 'data'] });
    expect(layout.sidebar.pinned).toEqual(['koros', 'data']);
    expect(Object.keys(layout.panels)).toEqual(['koros/navigator', 'data/navigator']);
    expect(validate(layout)).toEqual([]);
  });
});
