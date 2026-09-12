import { configure, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { testWorkbench } from '../../test/workbench';
import { groups, paneId } from '../core';
import { useLayout } from './context';
import { TabGroup } from './TabGroup';
import { WorkbenchProvider } from './WorkbenchProvider';

configure({ asyncUtilTimeout: 5000 });

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

// A tab's menu acts on the tab it was opened over, which need not be the
// focused panel: the command is given that panel by name.
function mount() {
  const services = testWorkbench({ defaultPinned: ['jobs', 'koros'] });
  services.store.dispatch({ type: 'move', panel: paneId('jobs'), to: { group: 'root' } });
  render(
    <WorkbenchProvider services={services}>
      <MainGroups />
    </WorkbenchProvider>,
  );
  return services;
}

describe("a tab's context menu", () => {
  it('runs move-to-sidebar on the tab it was opened over', async () => {
    const user = userEvent.setup();
    const services = mount();
    const tab = await screen.findByRole('tab', { name: /jobs/i });
    await user.pointer({ target: tab, keys: '[MouseRight]' });
    const item = await screen.findByRole('menuitem', { name: 'Move to sidebar' });

    // Spied after the menu is open, so only the item's own effect is seen.
    const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);
    const dispatch = vi.spyOn(services.store, 'dispatch');
    await user.click(item);

    expect(run).toHaveBeenCalledWith(
      'workbench:move-to-sidebar',
      { panel: paneId('jobs') },
      'user',
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
