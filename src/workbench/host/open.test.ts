import { describe, expect, it, vi } from 'vitest';
import type { Operation, PluginId, WorkbenchStore } from '../core';
import { createWorkbenchStore, defaultLayout, makeRoute, paneId, placementOf } from '../core';
import type { WorkbenchServices } from './services';
import { openPane, openRoute } from './open';

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


// `normalize` is the plugin's own judgement of what one page is, and the only
// thing the host compares paths by. A plugin whose route answers with
// something that is not a path would make every page distinct from every
// other, and the reader would collect a tab per press.
describe('openRoute against a route that does not answer with a path', () => {
  function services(store: WorkbenchStore, normalize: (p: string) => string) {
    return {
      store,
      dispatch: (op: Operation) => store.dispatch(op).changed,
      source: {
        has: (_: PluginId, kind: string) => kind === 'route',
        manifest: (plugin: PluginId) => ({ id: plugin, title: plugin }),
        module: () => Promise.resolve({ normalize }),
      },
      announcer: { announce: () => {} },
    } as unknown as WorkbenchServices;
  }

  it('says so once and takes the path as it stands, rather than opening a second tab', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createWorkbenchStore({ initial: defaultLayout() });
    const bad = () => undefined as unknown as string;

    const first = await openRoute(services(store, bad), 'gk', '/83333');
    const again = await openRoute(services(store, bad), 'gk', '/83333');

    expect(again).toBe(first);
    expect(Object.keys(store.get().panels)).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/plugin gk: its route's normalize/));
    warn.mockRestore();
  });
});
