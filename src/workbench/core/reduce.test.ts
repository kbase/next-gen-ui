import { describe, expect, it } from 'vitest';
import type { Layout } from './layout';
import { defaultLayout, makePanel } from './layout';
import type { Operation } from './operations';
import { placementOf, sidebarPanels } from './placement';
import { reduce } from './reduce';
import { validate } from './serialize';
import { groups } from './tree';

function counter() {
  let n = 0;
  return { newId: () => `id${++n}` };
}

function run(start: Layout, ...ops: Operation[]): Layout {
  const ctx = counter();
  const end = ops.reduce((l, op) => reduce(l, op, ctx), start);
  expect(validate(end)).toEqual([]);
  return end;
}

const arc = makePanel('koros', 'document', { slug: 'nitro' });
const job = makePanel('jobs', 'document', { id: '12' });
const jobsNav = makePanel('jobs', 'navigator');

describe('open', () => {
  it('adds a document to the root group and focuses it', () => {
    const l = run(defaultLayout(), { type: 'open', panel: arc });
    expect(placementOf(l, arc.id)).toEqual({ zone: 'main', group: 'root', active: true });
    expect(l.focus).toBe(arc.id);
  });

  it('opening an existing panel focuses instead of duplicating', () => {
    const l = run(
      defaultLayout(),
      { type: 'open', panel: arc },
      { type: 'open', panel: job },
      { type: 'open', panel: { ...arc } },
    );
    expect(groups(l.main)[0].tabs).toEqual([arc.id, job.id]);
    expect(groups(l.main)[0].active).toBe(arc.id);
  });

  it('opens beside a group when given a side', () => {
    const l = run(
      defaultLayout(),
      { type: 'open', panel: arc },
      { type: 'open', panel: job, target: { group: 'root', side: 'right' } },
    );
    expect(l.main.kind).toBe('split');
    expect(groups(l.main).map((g) => g.tabs)).toEqual([[arc.id], [job.id]]);
  });

  it('a pinned plugin navigator opens into the sidebar, unfolded', () => {
    const start = run(defaultLayout({ pinned: ['jobs'] }), {
      type: 'fold',
      panel: jobsNav.id,
      folded: true,
    });
    const l = run(start, { type: 'open', panel: jobsNav });
    expect(placementOf(l, jobsNav.id)).toEqual({ zone: 'sidebar', folded: false });
    expect(l.focus).toBe(jobsNav.id);
  });

  it('an unpinned plugin navigator opens as a main-area tab', () => {
    const l = run(defaultLayout(), { type: 'open', panel: jobsNav });
    expect(placementOf(l, jobsNav.id).zone).toBe('main');
  });
});

describe('focus', () => {
  it('is a no-op when the panel is already focused and active', () => {
    const start = run(defaultLayout(), { type: 'open', panel: arc });
    expect(reduce(start, { type: 'focus', panel: arc.id })).toBe(start);
  });
});

describe('close', () => {
  it('removes the panel, collapses the empty group and moves focus', () => {
    const l = run(
      defaultLayout(),
      { type: 'open', panel: arc },
      { type: 'open', panel: job, target: { group: 'root', side: 'right' } },
      { type: 'close', panel: job.id },
    );
    expect(l.main.kind).toBe('group');
    expect(job.id in l.panels).toBe(false);
    expect(l.focus).toBe(arc.id);
  });

  it('closing the last panel leaves an empty root and no focus', () => {
    const l = run(defaultLayout(), { type: 'open', panel: arc }, { type: 'close', panel: arc.id });
    expect(l.main).toEqual({ kind: 'group', id: 'root', tabs: [], active: null });
    expect(l.focus).toBeNull();
  });

  it('closing a pinned navigator from the main area returns it to the sidebar', () => {
    const l = run(
      defaultLayout({ pinned: ['jobs'] }),
      { type: 'move', panel: jobsNav.id, to: { group: 'root' } },
      { type: 'close', panel: jobsNav.id },
    );
    expect(placementOf(l, jobsNav.id)).toEqual({ zone: 'sidebar', folded: false });
  });

  it('is a no-op for a navigator sitting in the sidebar', () => {
    const start = defaultLayout({ pinned: ['jobs'] });
    expect(reduce(start, { type: 'close', panel: jobsNav.id })).toBe(start);
  });
});

describe('move', () => {
  it('reorders within a group using the pre-removal index', () => {
    const c = makePanel('jobs', 'document', { id: '3' });
    const l = run(
      defaultLayout(),
      { type: 'open', panel: arc },
      { type: 'open', panel: job },
      { type: 'open', panel: c },
      { type: 'move', panel: arc.id, to: { group: 'root', index: 2 } },
    );
    expect(groups(l.main)[0].tabs).toEqual([job.id, arc.id, c.id]);
  });

  it('a navigator dragged to the main area leaves the sidebar but keeps its pin', () => {
    const l = run(defaultLayout({ pinned: ['jobs', 'data'] }), {
      type: 'move',
      panel: jobsNav.id,
      to: { group: 'root' },
    });
    expect(sidebarPanels(l).map((p) => p.plugin)).toEqual(['data']);
    expect(l.sidebar.pinned).toEqual(['jobs', 'data']);
  });

  it('moving a navigator to the sidebar pins its plugin', () => {
    const l = run(
      defaultLayout(),
      { type: 'open', panel: jobsNav },
      { type: 'move', panel: jobsNav.id, to: { zone: 'sidebar' } },
    );
    expect(l.sidebar.pinned).toEqual(['jobs']);
    expect(placementOf(l, jobsNav.id).zone).toBe('sidebar');
  });

  it('refuses to put a document in the sidebar', () => {
    const start = run(defaultLayout(), { type: 'open', panel: arc });
    expect(reduce(start, { type: 'move', panel: arc.id, to: { zone: 'sidebar' } })).toBe(start);
  });

  it('reorders pins with a pre-removal sidebar index', () => {
    const start = defaultLayout({ pinned: ['koros', 'data', 'jobs'] });
    const dataNav = makePanel('data', 'navigator');
    const l = run(start, { type: 'move', panel: dataNav.id, to: { zone: 'sidebar', index: 0 } });
    expect(l.sidebar.pinned).toEqual(['data', 'koros', 'jobs']);
    // Downward past itself: index given before removal, like a tab move.
    const l2 = run(start, { type: 'move', panel: dataNav.id, to: { zone: 'sidebar', index: 3 } });
    expect(l2.sidebar.pinned).toEqual(['koros', 'jobs', 'data']);
  });

  it('a reorder to the same place is not a change', () => {
    const start = defaultLayout({ pinned: ['koros', 'data'] });
    const korosNav = makePanel('koros', 'navigator');
    const focused = reduce(start, { type: 'focus', panel: korosNav.id });
    expect(
      reduce(focused, { type: 'move', panel: korosNav.id, to: { zone: 'sidebar', index: 0 } }),
    ).toBe(focused);
  });
});

describe('pin and fold', () => {
  it('pin inserts at the index and creates the navigator panel', () => {
    const l = run(defaultLayout({ pinned: ['koros', 'data'] }), {
      type: 'pin',
      plugin: 'jobs',
      index: 1,
    });
    expect(l.sidebar.pinned).toEqual(['koros', 'jobs', 'data']);
    expect(jobsNav.id in l.panels).toBe(true);
  });

  it('unpin drops the navigator unless it lives in the main area', () => {
    const inSidebar = run(defaultLayout({ pinned: ['jobs'] }), { type: 'unpin', plugin: 'jobs' });
    expect(jobsNav.id in inSidebar.panels).toBe(false);

    const inMain = run(
      defaultLayout({ pinned: ['jobs'] }),
      { type: 'move', panel: jobsNav.id, to: { group: 'root' } },
      { type: 'unpin', plugin: 'jobs' },
    );
    expect(placementOf(inMain, jobsNav.id).zone).toBe('main');
  });

  it('fold only applies to sidebar navigators', () => {
    const start = run(defaultLayout(), { type: 'open', panel: arc });
    expect(reduce(start, { type: 'fold', panel: arc.id, folded: true })).toBe(start);
  });
});
