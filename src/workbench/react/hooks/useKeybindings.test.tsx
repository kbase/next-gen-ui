import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { testWorkbench } from '../../../test/workbench';
import { WorkbenchProvider } from '../WorkbenchProvider';
import { useKeybindings } from './useKeybindings';

// The hook is the whole subject: it needs a workbench and a mounted
// component, and nothing of the shell around it.
function mount() {
  const services = testWorkbench();
  function Keys() {
    useKeybindings();
    return <div />;
  }
  render(
    <WorkbenchProvider services={services}>
      <Keys />
    </WorkbenchProvider>,
  );
  const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);
  const bind = (keybindings: Record<string, string>) =>
    act(() => services.settings.set({ keybindings }));
  return { services, run, bind };
}

const ctrlZ = '{Control>}z{/Control}';

describe('what a keypress runs', () => {
  it('runs the default for a chord no override touches', async () => {
    const user = userEvent.setup();
    const { run } = mount();
    await user.keyboard(ctrlZ);
    expect(run).toHaveBeenCalledWith('workbench:undo', {}, 'user');
  });

  it("runs the user's override instead", async () => {
    const user = userEvent.setup();
    const { run, bind } = mount();
    bind({ 'Ctrl+Z': 'workbench:redo' });
    await user.keyboard(ctrlZ);
    expect(run).toHaveBeenCalledWith('workbench:redo', {}, 'user');
  });

  it('runs nothing for a chord the user took away', async () => {
    const user = userEvent.setup();
    const { run, bind } = mount();
    bind({ 'Ctrl+Z': '' });
    await user.keyboard(ctrlZ);
    expect(run).not.toHaveBeenCalled();
  });

  it('ignores an override whose command is not registered', async () => {
    const user = userEvent.setup();
    const { run, bind } = mount();
    bind({ 'Ctrl+Z': 'gone:vanished' });
    await user.keyboard(ctrlZ);
    // The default is uncovered rather than the chord going dead, and the
    // missing command is never reached for.
    expect(run).toHaveBeenCalledWith('workbench:undo', {}, 'user');
  });
});
