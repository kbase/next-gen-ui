import { describe, expect, it } from 'vitest';
import {
  createWorkbenchStore,
  defaultLayout,
  groups,
  makeRoute,
  paneId,
  placementOf,
} from '../core';
import { createCommandRegistry } from './registry';
import { complete } from './slash';
import { workbenchCommands } from './workbench-commands';

const arc = makeRoute('koros', '/nitro', 'a');
const job = makeRoute('jobs', '/12', 'b');

function setup() {
  const store = createWorkbenchStore({ initial: defaultLayout({ pinned: ['koros'] }) });
  const announced: string[] = [];
  const announce = (t: string) => void announced.push(t);
  // The two ways `show` can put a pane in front of the reader, recorded in
  // one list so a test can say which of them ran.
  const shown: string[] = [];
  const registry = createCommandRegistry();
  workbenchCommands({
    store,
    // What `createWorkbench` supplies, so an announcement a command causes
    // and one it speaks itself land in `announced` in the order heard.
    dispatch: (op) => {
      const result = store.dispatch(op);
      if (result.changed) announce(result.announcement);
      return result.changed;
    },
    announce,
    plugins: () => ['koros', 'data', 'jobs'],
    // Jobs is installed and has no pane, so `show` has one of each to refuse.
    panes: () => ['koros', 'data'],
    focusPane: (plugin) => void shown.push(`focus ${plugin}`),
    previewPane: (plugin) => void shown.push(`preview ${plugin}`),
    focusPrompt: () => announced.push('<prompt>'),
  }).forEach((c) => registry.register(c));
  store.dispatch({ type: 'open', panel: arc });
  store.dispatch({ type: 'open', panel: job });
  return { store, registry, announced, shown };
}

describe('workbench commands', () => {
  it('close removes the focused panel and announces it', async () => {
    const { store, registry, announced } = setup();
    await registry.run('close', {});
    expect(Object.keys(store.get().panels)).toEqual(['koros/pane', arc.id]);
    expect(announced).toEqual([`Closed ${job.id}`]);
  });

  it('close takes the panel it is given, not the focused one', async () => {
    const { store, registry, announced } = setup();
    await registry.run('close', { panel: arc.id });
    expect(Object.keys(store.get().panels)).toEqual(['koros/pane', job.id]);
    expect(announced.at(-1)).toBe(`Closed ${arc.id}`);
  });

  it('close refuses a panel that is not open', async () => {
    const { store, registry, announced } = setup();
    const before = store.get();
    await registry.run('close', { panel: 'ghost/pane' });
    expect(store.get()).toBe(before);
    expect(announced.at(-1)).toBe('No panel named ghost/pane');
  });

  it('tab focus wraps around', async () => {
    const { store, registry } = setup();
    await registry.run('focus-next-tab', {});
    expect(store.get().focus).toBe(arc.id);
    await registry.run('focus-next-tab', {});
    expect(store.get().focus).toBe(job.id);
  });

  it('move-right splits the focused tab out of its group', async () => {
    const { store, registry } = setup();
    await registry.run('move-right', {});
    expect(groups(store.get().main).map((g) => g.tabs)).toEqual([[arc.id], [job.id]]);
    await registry.run('move-right', {});
    expect(groups(store.get().main).length).toBe(2);
  });

  it('move-right splits the tab it is given', async () => {
    const { store, registry } = setup();
    await registry.run('move-right', { panel: arc.id });
    expect(groups(store.get().main).map((g) => g.tabs)).toEqual([[job.id], [arc.id]]);
  });

  it('fold folds and unfolds the block it is given', async () => {
    const { store, registry } = setup();
    const pane = paneId('koros');
    await registry.run('fold', { panel: pane });
    expect(store.get().sidebar.folded).toEqual([pane]);
    await registry.run('fold', { panel: pane });
    expect(store.get().sidebar.folded).toEqual([]);
  });

  it('fold says why it cannot fold a panel that is not a sidebar block', async () => {
    const { store, registry, announced } = setup();
    const before = store.get();
    await registry.run('fold', { panel: job.id });
    expect(store.get()).toBe(before);
    expect(announced.at(-1)).toBe(`${job.id} is not in the sidebar`);
  });

  it('move-to-main-area takes a block out of the sidebar and says why a tab stays', async () => {
    const { store, registry, announced } = setup();
    const pane = paneId('koros');
    await registry.run('move-to-main-area', { panel: pane });
    expect(placementOf(store.get(), pane).zone).toBe('main');
    const after = store.get();
    await registry.run('move-to-main-area', { panel: job.id });
    expect(store.get()).toBe(after);
    expect(announced.at(-1)).toBe(`${job.id} is not in the sidebar`);
    // The pane it just moved out is no longer a block either, and says so.
    await registry.run('move-to-main-area', { panel: pane });
    expect(announced.at(-1)).toBe(`${pane} is not in the sidebar`);
  });

  it('pin rejects an unknown plugin and accepts a known one', async () => {
    const { store, registry, announced } = setup();
    await registry.run('pin', { plugin: 'nope' });
    expect(store.get().sidebar.pinned).toEqual(['koros']);
    expect(announced.at(-1)).toBe('No plugin named nope');
    await registry.run('pin', { plugin: 'data' });
    expect(store.get().sidebar.pinned).toEqual(['koros', 'data']);
  });

  // A block draws a pane, so pinning a plugin without one could only ever
  // produce the ghost that says so.
  it('pin refuses a plugin that has no pane', async () => {
    const { store, registry, announced } = setup();
    await registry.run('pin', { plugin: 'jobs' });
    expect(store.get().sidebar.pinned).toEqual(['koros']);
    expect(announced.at(-1)).toBe('jobs has no pane');
  });

  it('toggle-bar hides and shows the named bar', async () => {
    const { store, registry, announced } = setup();
    await registry.run('toggle-bar', { bar: 'prompt' });
    expect(store.get().bars).toEqual({ prompt: false, status: true });
    expect(announced.at(-1)).toBe('Prompt bar hidden');
    await registry.run('toggle-bar', { bar: 'prompt' });
    expect(store.get().bars.prompt).toBe(true);
    expect(announced.at(-1)).toBe('Prompt bar shown');
  });

  it('toggle-bar refuses a bar the layout does not have', async () => {
    const { store, registry, announced } = setup();
    await registry.run('toggle-bar', { bar: 'menu' });
    expect(store.get().bars).toEqual({ prompt: true, status: true });
    expect(announced.at(-1)).toBe('No bar named menu');
  });

  it('move-to-sidebar returns the focused pane to the sidebar', async () => {
    const { store, registry, announced } = setup();
    const pane = paneId('koros');
    store.dispatch({ type: 'move', panel: pane, to: { group: 'root' } });
    expect(placementOf(store.get(), pane).zone).toBe('main');
    await registry.run('move-to-sidebar', {});
    expect(placementOf(store.get(), pane).zone).toBe('sidebar');
    expect(announced.at(-1)).toBe(`Moved ${pane} to the sidebar`);
  });

  it('move-to-sidebar moves the pane it is given, not the focused one', async () => {
    const { store, registry, announced } = setup();
    const pane = paneId('koros');
    store.dispatch({ type: 'move', panel: pane, to: { group: 'root' } });
    store.dispatch({ type: 'focus', panel: job.id });
    await registry.run('move-to-sidebar', { panel: pane });
    expect(placementOf(store.get(), pane).zone).toBe('sidebar');
    expect(announced.at(-1)).toBe(`Moved ${pane} to the sidebar`);
  });

  it('move-to-sidebar refuses a panel that is not open', async () => {
    const { store, registry, announced } = setup();
    const before = store.get();
    await registry.run('move-to-sidebar', { panel: 'ghost/pane' });
    expect(store.get()).toBe(before);
    expect(announced.at(-1)).toBe('No panel named ghost/pane');
  });

  // The promise a ranked row makes by saying "Show": whichever branch it
  // takes, the arrangement of the workbench is the same afterwards.
  it('show focuses a pinned plugin where it already sits', async () => {
    const { store, registry, shown } = setup();
    const before = store.get();
    await registry.run('show', { plugin: 'koros' });
    expect(shown).toEqual(['focus koros']);
    expect(store.get()).toBe(before);
  });

  it('show previews an unpinned plugin, and says so because no operation will', async () => {
    const { store, registry, announced, shown } = setup();
    const before = store.get();
    await registry.run('show', { plugin: 'data' });
    expect(shown).toEqual(['preview data']);
    expect(announced.at(-1)).toBe('Previewing data in the sidebar');
    expect(store.get()).toBe(before);
  });

  it('show refuses a plugin with no pane, and one that is not installed', async () => {
    const { registry, announced, shown } = setup();
    await registry.run('show', { plugin: 'jobs' });
    expect(announced.at(-1)).toBe('jobs has no pane');
    await registry.run('show', { plugin: 'ghost' });
    expect(announced.at(-1)).toBe('No plugin named ghost');
    expect(shown).toEqual([]);
  });

  it('pin puts a plugin at the position it is given', async () => {
    const { store, registry } = setup();
    await registry.run('pin', { plugin: 'data', index: '0' });
    expect(store.get().sidebar.pinned).toEqual(['data', 'koros']);
    await registry.run('pin', { plugin: 'data', index: '1' });
    expect(store.get().sidebar.pinned).toEqual(['koros', 'data']);
  });

  it('pin refuses a position past the last pin, and one that is not a number', async () => {
    const { store, registry, announced } = setup();
    // One plugin is pinned, so 0 and 1 are the positions; 2 is past the end.
    await registry.run('pin', { plugin: 'data', index: '2' });
    expect(store.get().sidebar.pinned).toEqual(['koros']);
    expect(announced.at(-1)).toBe('No pin position 2');
    await registry.run('pin', { plugin: 'data', index: 'last' });
    expect(store.get().sidebar.pinned).toEqual(['koros']);
    expect(announced.at(-1)).toBe('No pin position last');
  });

  it('completes each argument with what its command can act on', async () => {
    const { store, registry } = setup();
    const pane = paneId('koros');
    const argOf = (name: string, arg: string) =>
      registry.get(`workbench:${name}`)?.args?.find((a) => a.name === arg);

    // The pane is a sidebar block: it can be folded or moved out, and the
    // two tabs are what can be closed or split.
    expect(await argOf('fold', 'panel')?.complete?.('')).toEqual([pane]);
    expect(await argOf('move-to-main-area', 'panel')?.complete?.('')).toEqual([pane]);
    expect(await argOf('close', 'panel')?.complete?.('')).toEqual([arc.id, job.id]);
    expect(await argOf('move-to-sidebar', 'panel')?.complete?.('')).toEqual([]);

    // Dragged into the main area, the same pane swaps sides of that split.
    store.dispatch({ type: 'move', panel: pane, to: { group: 'root' } });
    expect(await argOf('move-to-sidebar', 'panel')?.complete?.('')).toEqual([pane]);
    expect(await argOf('fold', 'panel')?.complete?.('')).toEqual([]);
    expect(await argOf('pin', 'index')?.complete?.('')).toEqual(['0', '1']);
    // A block draws a pane, so pinning offers only the plugins that have one.
    expect(await argOf('pin', 'plugin')?.complete?.('')).toEqual(['koros', 'data']);

    // `show` acts on plugins rather than panels, and only on the ones that
    // have a pane for it to show.
    expect(await argOf('show', 'plugin')?.complete?.('')).toEqual(['koros', 'data']);
  });

  it('move-to-sidebar leaves a focused route where it is, and says why', async () => {
    const { store, registry, announced } = setup();
    const before = store.get();
    await registry.run('move-to-sidebar', {});
    expect(store.get()).toBe(before);
    expect(announced.at(-1)).toBe(
      `${job.id} is a page, and only a plugin's pane goes in the sidebar`,
    );
  });

  // A keybinding runs a command the prompt bar would have completed and the
  // other way round: the registry offers every command whatever has focus,
  // and the ones that cannot act on this layout answer when they are run.
  it('offers the same commands however the layout is arranged', async () => {
    const { store, registry } = setup();
    const offered = async () => (await complete(registry, '/')).map((o) => o.value);
    const withRouteFocused = await offered();
    expect(withRouteFocused).toEqual(expect.arrayContaining(['/fold', '/move-to-sidebar']));

    store.dispatch({ type: 'focus', panel: paneId('koros') });
    expect(await offered()).toEqual(withRouteFocused);
  });

  it('lock-layout toggles the lock and undo speaks up when empty', async () => {
    const { store, registry, announced } = setup();
    await registry.run('lock-layout', {});
    expect(store.get().locked).toBe(true);
    expect(announced.at(-1)).toBe('Layout locked');
    await registry.run('lock-layout', {});
    expect(store.get().locked).toBe(false);
    // The lock toggles are not undo steps; only setup's opens drain.
    await registry.run('undo', {});
    await registry.run('undo', {});
    await registry.run('undo', {});
    expect(announced.at(-1)).toBe('Nothing to undo');
  });
});
