import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PanelContext } from '../../../plugins/sdk';
import type { PanelHandle } from '../../../plugins/sdk';
import { testWorkbench } from '../../../test/workbench';
import { WorkbenchProvider } from '../../react/WorkbenchProvider';
import { HomeDocument } from './Home';

// The page is a panel, so it needs a handle to set its title on; nothing
// else here reads one.
const panel = {
  id: 'home/route',
  plugin: 'home',
  kind: 'route',
  path: '/',
  focused: true,
  navigate: () => {},
  setTitle: () => {},
  setCrumbs: () => {},
  setTerms: () => {},
  subscribe: () => () => {},
} satisfies PanelHandle;

// Jobs is the pinned pane and Data an unpinned one, so the two cards are the
// two branches of `show`.
function mount() {
  const services = testWorkbench({ defaultPinned: ['jobs'] });
  render(
    <WorkbenchProvider services={services}>
      <PanelContext.Provider value={panel}>
        <HomeDocument />
      </PanelContext.Provider>
    </WorkbenchProvider>,
  );
  return services;
}

describe('the Panels section of the Home page', () => {
  it.each([['Jobs'], ['Data']])(
    '%s runs workbench:show, whether or not it is pinned',
    async (title) => {
      const user = userEvent.setup();
      const services = mount();
      const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);
      const preview = vi.spyOn(services.preview, 'set');

      await user.click(screen.getByRole('button', { name: new RegExp(`^${title}`) }));

      // One call for both cards: which of focusing and previewing happens is
      // the command's to decide, and the page no longer writes that rule out.
      expect(run).toHaveBeenCalledWith('workbench:show', { plugin: title.toLowerCase() }, 'user');
      expect(preview).not.toHaveBeenCalled();
    },
  );
});
