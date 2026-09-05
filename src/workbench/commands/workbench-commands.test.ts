import { describe, expect, it } from 'vitest';
import { createWorkbenchStore, defaultLayout, groups, makePanel } from '../core';
import { createCommandRegistry } from './registry';
import { workbenchCommands } from './workbench-commands';

const arc = makePanel('koros', 'document', { slug: 'nitro' });
const job = makePanel('jobs', 'document', { id: '12' });

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
    expect(Object.keys(store.get().panels)).toEqual(['koros/navigator', arc.id]);
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
