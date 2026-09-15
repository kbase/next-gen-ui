import { configure, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { testWorkbench } from '../../../test/workbench';
import { groups, makeRoute, paneId } from '../../core';
import { useLayout } from '../context';
import { TabGroup } from './TabGroup';
import { WorkbenchProvider } from '../WorkbenchProvider';

configure({ asyncUtilTimeout: 5000 });

// Every item a tab's menu offers, and the command it runs on that tab. The
// menu is listed against this table below, so an item added without a
// command fails here rather than passing unnoticed.
const ACTIONS: Array<[item: string, command: string]> = [
  ['Close', 'workbench:close'],
  ['Split left', 'workbench:move-left'],
  ['Split right', 'workbench:move-right'],
  ['Split up', 'workbench:move-up'],
  ['Split down', 'workbench:move-down'],
  ['Move to sidebar', 'workbench:move-to-sidebar'],
];

function MainGroups() {
  const layout = useLayout();
  return (
    <>
      {groups(layout.main).map((g) => (
        <TabGroup key={g.id} group={g} />
      ))}
    </>
  );
}

// The jobs pane sits in the main area beside a route, so it is a tab that
// can be moved to the sidebar and the splits are not disabled. Focus is on
// the route the open put there, never on the tab these tests act on.
function mount() {
  const services = testWorkbench({ defaultPinned: ['jobs', 'koros'] });
  services.store.dispatch({ type: 'move', panel: paneId('jobs'), to: { group: 'root' } });
  services.store.dispatch({ type: 'open', panel: makeRoute('jobs', '/12', 'a') });
  render(
    <WorkbenchProvider services={services}>
      <MainGroups />
    </WorkbenchProvider>,
  );
  return services;
}

type User = ReturnType<typeof userEvent.setup>;
type Services = ReturnType<typeof mount>;

const paneTab = () => screen.findByRole('tab', { name: 'Jobs' });

async function openTabMenu(user: User) {
  await user.pointer({ target: await paneTab(), keys: '[MouseRight]' });
  return screen.findByRole('menu');
}

// Spied once the menu is open, so what the assertions see is the item's own
// effect and not the clicks that got there.
function watch(services: Services) {
  return {
    run: vi.spyOn(services.registry, 'run').mockResolvedValue(undefined),
    dispatch: vi.spyOn(services.store, 'dispatch'),
  };
}

describe("a tab's context menu", () => {
  it.each(ACTIONS)('%s runs %s on the tab it was opened over', async (item, command) => {
    const user = userEvent.setup();
    const services = mount();
    await openTabMenu(user);
    const { run, dispatch } = watch(services);

    await user.click(await screen.findByRole('menuitem', { name: item }));

    expect(run).toHaveBeenCalledWith(command, { panel: paneId('jobs') }, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('offers nothing the table above does not list', async () => {
    const user = userEvent.setup();
    mount();
    const menu = await openTabMenu(user);
    const items = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    expect(items.map((el) => el.textContent?.trim())).toEqual(ACTIONS.map(([item]) => item));
  });
});

describe('the tab strip', () => {
  // Delete is the strip's own key, so it names the tab the strip is on;
  // Alt+Shift+W, the global binding, closes whatever is focused.
  it('runs close on its active tab when Delete is pressed', async () => {
    const user = userEvent.setup();
    const services = mount();
    const active = groups(services.store.get().main)[0].active;
    (await screen.findByRole('tab', { selected: true })).focus();
    const { run, dispatch } = watch(services);

    await user.keyboard('{Delete}');

    expect(run).toHaveBeenCalledWith('workbench:close', { panel: active }, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });

  // The other half of the rule: a gesture on the tab is not a named action,
  // and closing by middle click stays a dispatch.
  it('closes by middle click without the registry', async () => {
    const user = userEvent.setup();
    const services = mount();
    const tab = await paneTab();
    const { run, dispatch } = watch(services);

    await user.pointer({ target: tab, keys: '[MouseMiddle]' });

    expect(run).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({ type: 'close', panel: paneId('jobs') });
  });
});
