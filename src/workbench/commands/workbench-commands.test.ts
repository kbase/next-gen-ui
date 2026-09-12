import { describe, expect, it } from 'vitest';
import { createWorkbenchStore, defaultLayout, groups, makeRoute, paneId, placementOf } from '../core';
import { createCommandRegistry } from './registry';
import { workbenchCommands } from './workbench-commands';

const arc = makeRoute('koros', '/nitro', 'a');
const job = makeRoute('jobs', '/12', 'b');

function setup() {
  const store = createWorkbenchStore({ initial: defaultLayout({ pinned: ['koros'] }) });
  const announced: string[] = [];
  const registry = createCommandRegistry();
  workbenchCommands({
    store,
    announce: (t) => announced.push(t),
    plugins: () => ['koros', 'data', 'jobs'],
    focusPrompt: () => announced.push('<prompt>'),
  }).forEach((c) => registry.register(c));
  store.dispatch({ type: 'open', panel: arc });
  store.dispatch({ type: 'open', panel: job });
  return { store, registry, announced };
}

describe('workbench commands', () => {
  it('close removes the focused panel and announces it', async () => {
    const { store, registry, announced } = setup();
    await registry.run('close', {});
    expect(Object.keys(store.get().panels)).toEqual(['koros/pane', arc.id]);
    expect(announced).toEqual([`Closed ${job.id}`]);
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

  it('pin rejects an unknown plugin and accepts a known one', async () => {
    const { store, registry, announced } = setup();
    await registry.run('pin', { plugin: 'nope' });
    expect(store.get().sidebar.pinned).toEqual(['koros']);
    expect(announced.at(-1)).toBe('No plugin named nope');
    await registry.run('pin', { plugin: 'jobs' });
    expect(store.get().sidebar.pinned).toEqual(['koros', 'jobs']);
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

  it('move-to-sidebar leaves a focused route where it is', async () => {
    const { store, registry } = setup();
    const before = store.get();
    await registry.run('move-to-sidebar', {});
    expect(store.get()).toBe(before);
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
