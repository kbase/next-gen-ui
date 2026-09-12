import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { localPlugins } from '../../plugins/local';
import { createWorkbench, noPersistence } from '../host';
import { makeRoute, paneId } from '../core';
import { DEFAULT_ASSISTANT, DEFAULT_INTENT } from '../../workbenchDefaults';
import { WorkbenchProvider } from './WorkbenchProvider';
import { WorkbenchMenubar } from './WorkbenchMenubar';

// Every item the menubar offers, and the command it runs. The menus are
// listed against this table below, so an item added without a command fails
// here rather than passing unnoticed.
const ACTIONS: Array<[menu: string, item: string, command: string, args: object]> = [
  ['Workbench', 'Undo', 'workbench:undo', {}],
  ['Workbench', 'Redo', 'workbench:redo', {}],
  ['Workbench', 'Lock layout', 'workbench:lock-layout', {}],
  ['Workbench', 'Sidebar', 'workbench:sidebar', {}],
  ['Workbench', 'Prompt bar', 'workbench:toggle-bar', { bar: 'prompt' }],
  ['Workbench', 'Status bar', 'workbench:toggle-bar', { bar: 'status' }],
  ['Workbench', 'Settings', 'settings:settings', {}],
  ['Panel', 'Close', 'workbench:close', {}],
  ['Panel', 'Split left', 'workbench:move-left', {}],
  ['Panel', 'Split right', 'workbench:move-right', {}],
  ['Panel', 'Split up', 'workbench:move-up', {}],
  ['Panel', 'Split down', 'workbench:move-down', {}],
  ['Panel', 'Move to sidebar', 'workbench:move-to-sidebar', {}],
  // The Plugins menu is one checkbox per plugin with a pane; jobs is pinned
  // here and data is not, so the two directions are both covered.
  ['Plugins', 'Jobs', 'workbench:unpin', { plugin: 'jobs' }],
  ['Plugins', 'Data', 'workbench:pin', { plugin: 'data' }],
];

function mount() {
  const services = createWorkbench({
    installed: localPlugins,
    persistence: noPersistence,
    defaultPinned: ['jobs', 'koros'],
    defaultAssistant: DEFAULT_ASSISTANT,
    defaultIntent: DEFAULT_INTENT,
  });
  // Each item is enabled only in the right arrangement: Undo and Redo want a
  // history, Close and the splits a focused tab beside another, and Move to
  // sidebar wants that tab to be a pane.
  services.store.dispatch({ type: 'open', panel: makeRoute('jobs', '/12', 'a') });
  services.store.dispatch({ type: 'move', panel: paneId('jobs'), to: { group: 'root' } });
  services.store.dispatch({ type: 'pin', plugin: 'related' });
  services.store.undo();
  render(
    <WorkbenchProvider services={services}>
      <WorkbenchMenubar />
    </WorkbenchProvider>,
  );
  return services;
}

type User = ReturnType<typeof userEvent.setup>;

// Items and menubar triggers carry different roles depending on the menu, so
// both are found by the text the reader sees.
async function openMenu(user: User, menu: string) {
  const bar = screen.getByRole('menubar', { name: 'Workbench menu' });
  await user.click(within(bar).getByText(menu));
}

async function itemsOf(): Promise<HTMLElement[]> {
  const popup = await screen.findByRole('menu');
  return [...popup.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
}

const labelsOf = (items: HTMLElement[]) => items.map((el) => el.textContent?.trim());

async function clickItem(user: User, name: string) {
  const item = (await itemsOf()).find((el) => el.textContent?.trim() === name);
  if (!item) throw new Error(`the menu offers no item named ${name}`);
  await user.click(item);
}

describe('the workbench menubar', () => {
  it.each(ACTIONS)('%s > %s runs %s', async (menu, item, command, args) => {
    const user = userEvent.setup();
    const services = mount();
    // The spy does not call through: an item that dispatched instead would
    // still reach the store, and the second assertion catches it.
    const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);
    const dispatch = vi.spyOn(services.store, 'dispatch');

    await openMenu(user, menu);
    await clickItem(user, item);

    expect(run).toHaveBeenCalledWith(command, args, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('offers nothing the table above does not list', async () => {
    const user = userEvent.setup();
    const services = mount();
    const panes = services.source
      .plugins()
      .filter((p) => services.source.has(p.id, 'pane'))
      .map((p) => p.title);
    const listed = (menu: string) => ACTIONS.filter(([m]) => m === menu).map(([, i]) => i);

    for (const [menu, expected] of [
      ['Workbench', listed('Workbench')],
      ['Panel', listed('Panel')],
      ['Plugins', panes],
    ] as Array<[string, string[]]>) {
      await openMenu(user, menu);
      expect(labelsOf(await itemsOf())).toEqual(expected);
      await user.keyboard('{Escape}');
    }
    expect(panes).toEqual(expect.arrayContaining(listed('Plugins')));
  });
});
