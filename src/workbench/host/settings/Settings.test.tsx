import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PanelContext } from '../../../plugins/sdk';
import type { PanelHandle } from '../../../plugins/sdk';
import { testWorkbench } from '../../../test/workbench';
import { useKeybindings } from '../../react/useKeybindings';
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

// The page is mounted with the window listener that reads the table it
// edits, because recording a chord has to keep the keypress away from it.
function mount() {
  const services = testWorkbench({ defaultPinned: ['jobs'] });
  function Page() {
    useKeybindings();
    return <SettingsDocument />;
  }
  render(
    <WorkbenchProvider services={services}>
      <PanelContext.Provider value={panel}>
        <Page />
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

// Both settings hold a plugin id and nothing else: with neither chosen the
// prompt bar has nothing to do with what is typed into it.
describe("the Settings page's plugin choices", () => {
  it.each([
    ['Assistant', 'KOROS', 'assistant', 'koros'],
    ['Suggestions', 'Intent', 'intent', 'intent'],
  ])('%s offers no None, and picking one writes its id', async (group, title, key, id) => {
    const user = userEvent.setup();
    const services = mount();
    const section = within(screen.getByRole('radiogroup', { name: group }));

    expect(section.queryByRole('radio', { name: 'None' })).not.toBeInTheDocument();

    await user.click(section.getByRole('radio', { name: title }));
    expect(services.settings.get()[key as 'assistant' | 'intent']).toBe(id);
  });
});

const UNDO = 'Undo the last layout change';
const REDO = 'Redo the last undone layout change';

// The row is the list item holding the command's Change button.
function row(title: string) {
  const button = screen.getByRole('button', {
    name: new RegExp(`^(Change|Set) the key for ${title}$`),
  });
  const item = button.closest('li');
  if (!item) throw new Error(`no row for ${title}`);
  return within(item);
}

const change = (title: string) =>
  screen.getByRole('button', { name: `Change the key for ${title}` });

describe("the Settings page's keyboard section", () => {
  it('shows the chord that runs each command, and offers no row for one that needs an argument', () => {
    mount();
    expect(row(UNDO).getByText('Ctrl+Z')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /the key for Pin a plugin/ }),
    ).not.toBeInTheDocument();
  });

  it('binds the chord the user presses and leaves the one it replaced dead', async () => {
    const user = userEvent.setup();
    const services = mount();
    const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);

    await user.click(change(UNDO));
    await user.keyboard('{Control>}y{/Control}');

    expect(services.settings.get().keybindings).toEqual({
      'Ctrl+Z': '',
      'Ctrl+Y': 'workbench:undo',
    });
    expect(row(UNDO).getByText('Ctrl+Y')).toBeInTheDocument();
    // The binding is live the moment it is written: no reload, no dispatch.
    await user.keyboard('{Control>}y{/Control}');
    expect(run).toHaveBeenCalledWith('workbench:undo', {}, 'user');
    run.mockClear();
    await user.keyboard('{Control>}z{/Control}');
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a chord another command holds, and names the command holding it', async () => {
    const user = userEvent.setup();
    const services = mount();

    await user.click(change(UNDO));
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(row(UNDO).getByRole('status')).toHaveTextContent(`That key runs ${REDO}`);
    expect(services.settings.get().keybindings).toEqual({});
    expect(row(UNDO).getByText('Ctrl+Z')).toBeInTheDocument();
    // Still listening, so the next chord is taken without clicking again.
    await user.keyboard('{Control>}y{/Control}');
    expect(services.settings.get().keybindings).toEqual({
      'Ctrl+Z': '',
      'Ctrl+Y': 'workbench:undo',
    });
  });

  it('does not run the command a chord is bound to while it is being recorded', async () => {
    const user = userEvent.setup();
    const services = mount();
    const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);

    await user.click(change(UNDO));
    await user.keyboard('{Control>}z{/Control}');

    expect(run).not.toHaveBeenCalled();
    // Its own chord, so the table is back where it started rather than
    // holding an override that restates the default.
    expect(services.settings.get().keybindings).toEqual({});
  });

  it('takes a key away and gives the default back', async () => {
    const user = userEvent.setup();
    const services = mount();

    await user.click(screen.getByRole('button', { name: `Remove the key for ${UNDO}` }));
    expect(services.settings.get().keybindings).toEqual({ 'Ctrl+Z': '' });
    expect(row(UNDO).getByText('No key')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Reset the key for ${UNDO}` }));
    expect(services.settings.get().keybindings).toEqual({});
    expect(row(UNDO).getByText('Ctrl+Z')).toBeInTheDocument();
  });
});
