import { describe, expect, it } from 'vitest';
import type { Operation, PluginId, WorkbenchStore } from '../core';
import { createWorkbenchStore, defaultLayout, makeRoute, paneId, placementOf } from '../core';
import type { WorkbenchServices } from './services';
import { openPane } from './open';

const arc = makeRoute('koros', '/nitro', 'a');

// Only the four members openPane reaches for.
function fakeServices(store: WorkbenchStore, withPane: PluginId[]): WorkbenchServices {
  return {
    store,
    dispatch: (op: Operation) => store.dispatch(op).changed,
    source: {
      has: (plugin: PluginId, kind: string) => kind === 'pane' && withPane.includes(plugin),
      manifest: (plugin: PluginId) => ({ id: plugin, title: plugin }),
    },
    announcer: { announce: () => {} },
  } as unknown as WorkbenchServices;
}

describe('openPane', () => {
  it('focuses a pinned block without spending the undo step', () => {
    const store = createWorkbenchStore({ initial: defaultLayout({ pinned: ['jobs'] }) });
    store.dispatch({ type: 'open', panel: arc });

    expect(openPane(fakeServices(store, ['jobs']), 'jobs')).toBe(true);
    expect(store.get().focus).toBe(paneId('jobs'));
    // The block was already in the sidebar, so nothing but focus moved.
    expect(placementOf(store.get(), paneId('jobs'))).toEqual({ zone: 'sidebar', folded: false });

    // One Ctrl+Z reaches the open, not the focus change.
    expect(store.undo()).toBe(true);
    expect(store.get().panels[arc.id]).toBeUndefined();
    expect(store.canUndo()).toBe(false);
  });

  it('unfolds a folded block rather than opening a second copy', () => {
    const store = createWorkbenchStore({ initial: defaultLayout({ pinned: ['jobs'] }) });
    store.dispatch({ type: 'fold', panel: paneId('jobs'), folded: true });

    openPane(fakeServices(store, ['jobs']), 'jobs');
    expect(store.get().sidebar.folded).toEqual([]);
    expect(store.get().focus).toBe(paneId('jobs'));
    // The fold is the only step on the stack: one undo lands before it.
    expect(store.undo()).toBe(true);
    expect(store.get().focus).toBeNull();
    expect(store.canUndo()).toBe(false);
  });

  it('opens an unpinned pane as a tab, which is an undo step', () => {
    const store = createWorkbenchStore({ initial: defaultLayout() });

    expect(openPane(fakeServices(store, ['jobs']), 'jobs')).toBe(true);
    expect(placementOf(store.get(), paneId('jobs'))).toEqual({
      zone: 'main',
      group: 'root',
      active: true,
    });
    expect(store.canUndo()).toBe(true);
    store.undo();
    expect(store.get().panels[paneId('jobs')]).toBeUndefined();
  });

  it('reports a plugin with no pane and leaves the layout alone', () => {
    const store = createWorkbenchStore({ initial: defaultLayout() });
    const before = store.get();

    expect(openPane(fakeServices(store, []), 'jobs')).toBe(false);
    expect(store.get()).toBe(before);
  });
});
