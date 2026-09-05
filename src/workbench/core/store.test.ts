import { describe, expect, it } from 'vitest';
import { defaultLayout, makePanel } from './layout';
import { createWorkbenchStore } from './store';

const arc = makePanel('koros', 'document', { slug: 'nitro' });
const job = makePanel('jobs', 'document', { id: '12' });

describe('store in use mode', () => {
  it('snapshots structural operations and undoes them one at a time', () => {
    const store = createWorkbenchStore({ initial: defaultLayout() });
    store.dispatch({ type: 'open', panel: arc });
    store.dispatch({ type: 'open', panel: job });
    store.dispatch({ type: 'focus', panel: arc.id });
    expect(store.undo()).toBe(true);
    expect(Object.keys(store.get().panels)).toEqual([arc.id]);
    expect(store.redo()).toBe(true);
    expect(Object.keys(store.get().panels)).toEqual([arc.id, job.id]);
  });

  it('reports no change and no announcement for a no-op', () => {
    const store = createWorkbenchStore({ initial: defaultLayout() });
    expect(store.dispatch({ type: 'close', panel: 'nope' })).toEqual({
      changed: false,
      announcement: '',
    });
    expect(store.canUndo()).toBe(false);
  });

  it('announces with the caller-supplied titles', () => {
    const store = createWorkbenchStore({
      initial: defaultLayout(),
      title: (id, panel) => (panel?.plugin === 'koros' ? 'Arc: nitro' : id),
    });
    expect(store.dispatch({ type: 'open', panel: arc }).announcement).toBe('Opened Arc: nitro');
  });

  it('hands the panel record to the title lookup on open and on close', () => {
    const store = createWorkbenchStore({
      initial: defaultLayout(),
      title: (_id, panel) => panel?.params.slug ?? 'gone',
    });
    expect(store.dispatch({ type: 'open', panel: arc }).announcement).toBe('Opened nitro');
    expect(store.dispatch({ type: 'close', panel: arc.id }).announcement).toBe('Closed nitro');
  });

  it('a new operation clears the redo stack', () => {
    const store = createWorkbenchStore({ initial: defaultLayout() });
    store.dispatch({ type: 'open', panel: arc });
    store.undo();
    store.dispatch({ type: 'open', panel: job });
    expect(store.canRedo()).toBe(false);
  });
});

describe('locked layout', () => {
  it('refuses structural operations and keeps usage free', () => {
    const store = createWorkbenchStore({ initial: defaultLayout() });
    store.dispatch({ type: 'open', panel: arc });
    store.dispatch({ type: 'lock', locked: true });
    expect(store.dispatch({ type: 'pin', plugin: 'jobs' }).changed).toBe(false);
    expect(store.dispatch({ type: 'move', panel: arc.id, to: { zone: 'sidebar' } }).changed).toBe(
      false,
    );
    // Opening, closing and folding are usage, not arrangement.
    expect(store.dispatch({ type: 'open', panel: job }).changed).toBe(true);
    expect(store.dispatch({ type: 'close', panel: job.id }).changed).toBe(true);
  });

  it('unlocking restores structural operations; the toggle is not an undo step', () => {
    const store = createWorkbenchStore({ initial: defaultLayout() });
    store.dispatch({ type: 'lock', locked: true });
    expect(store.canUndo()).toBe(false);
    store.dispatch({ type: 'lock', locked: false });
    store.dispatch({ type: 'pin', plugin: 'jobs' });
    expect(store.get().sidebar.pinned).toEqual(['jobs']);
  });
});
