import { configure, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PluginId } from '../core';
import { paneId } from '../core';
import { testWorkbench } from '../../test/workbench';
import { Sidebar } from './Sidebar';
import { WorkbenchProvider } from './WorkbenchProvider';

configure({ asyncUtilTimeout: 5000 });

// Every item a block's menu offers, and the command it runs. What names the
// block differs by command: folding and unfolding act on the panel, pinning
// on the plugin, and a reorder adds the position it is moving to. KOROS is
// pinned between two others here so both directions are offered. The menu is
// listed against this table below, so an item added without a command fails
// here rather than passing unnoticed.
const ACTIONS: Array<[item: string, command: string, args: object]> = [
  ['Fold', 'workbench:fold', { panel: paneId('koros') }],
  ['Move to main area', 'workbench:move-to-main-area', { panel: paneId('koros') }],
  ['Move up', 'workbench:pin', { plugin: 'koros', index: '0' }],
  ['Move down', 'workbench:pin', { plugin: 'koros', index: '2' }],
  ['Unpin', 'workbench:unpin', { plugin: 'koros' }],
];

function mount(pinned: PluginId[]) {
  const services = testWorkbench({ defaultPinned: pinned });
  render(
    <WorkbenchProvider services={services}>
      <Sidebar />
    </WorkbenchProvider>,
  );
  return services;
}

type User = ReturnType<typeof userEvent.setup>;

async function openBlockMenu(user: User, title: string) {
  await user.pointer({
    target: await screen.findByRole('button', { name: title }),
    keys: '[MouseRight]',
  });
}

// Spied once the menu is open, so what the assertions see is the item's own
// effect and not the clicks that got there.
function watch(services: ReturnType<typeof mount>) {
  return {
    run: vi.spyOn(services.registry, 'run').mockResolvedValue(undefined),
    dispatch: vi.spyOn(services.store, 'dispatch'),
  };
}

describe("a sidebar block's menu", () => {
  it.each(ACTIONS)('%s runs %s', async (item, command, args) => {
    const user = userEvent.setup();
    const services = mount(['jobs', 'koros', 'data']);
    await openBlockMenu(user, 'KOROS');
    const { run, dispatch } = watch(services);

    await user.click(await screen.findByRole('menuitem', { name: item }));

    expect(run).toHaveBeenCalledWith(command, args, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('offers nothing the table above does not list', async () => {
    const user = userEvent.setup();
    mount(['jobs', 'koros', 'data']);
    await openBlockMenu(user, 'KOROS');
    const menu = await screen.findByRole('menu');
    const items = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    expect(items.map((el) => el.textContent?.trim())).toEqual(ACTIONS.map(([item]) => item));
  });
});

describe("a preview block's Pin button", () => {
  it('runs pin for the plugin being previewed', async () => {
    const user = userEvent.setup();
    const services = mount(['jobs', 'koros']);
    await user.click(screen.getByRole('button', { name: /^More plugins \(\d+\)$/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Data' }));
    const preview = await screen.findByRole('region', { name: 'Data preview' });
    const { run, dispatch } = watch(services);

    await user.click(within(preview).getByRole('button', { name: 'Pin' }));

    expect(run).toHaveBeenCalledWith('workbench:pin', { plugin: 'data' }, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });
});
