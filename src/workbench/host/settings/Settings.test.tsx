import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PanelContext } from '../../../plugins/sdk';
import type { PanelHandle } from '../../../plugins/sdk';
import { testWorkbench } from '../../../test/workbench';
import { WorkbenchProvider } from '../../react/WorkbenchProvider';
import { SettingsDocument } from './Settings';

// The page is a panel, so it needs a handle to set its title on; nothing
// else here reads one.
const panel = {
  id: 'settings/route',
  plugin: 'settings',
  kind: 'route',
  path: '/',
  focused: true,
  navigate: () => {},
  setTitle: () => {},
  setCrumbs: () => {},
  setTerms: () => {},
  subscribe: () => () => {},
} satisfies PanelHandle;

function mount() {
  const services = testWorkbench({ defaultPinned: ['jobs'] });
  render(
    <WorkbenchProvider services={services}>
      <PanelContext.Provider value={panel}>
        <SettingsDocument />
      </PanelContext.Provider>
    </WorkbenchProvider>,
  );
  return services;
}

describe("the Settings page's pin switch", () => {
  it.each([
    ['Data', 'workbench:pin', 'data'],
    ['Jobs', 'workbench:unpin', 'jobs'],
  ])('%s runs %s', async (title, command, plugin) => {
    const user = userEvent.setup();
    const services = mount();
    const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);
    const dispatch = vi.spyOn(services.store, 'dispatch');

    await user.click(screen.getByRole('switch', { name: `Pin ${title} to the sidebar` }));

    expect(run).toHaveBeenCalledWith(command, { plugin }, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });
});
