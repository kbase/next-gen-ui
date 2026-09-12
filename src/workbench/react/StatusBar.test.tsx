import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { localPlugins } from '../../plugins/local';
import { createWorkbench, noPersistence } from '../host';
import { DEFAULT_ASSISTANT, DEFAULT_INTENT, DEFAULT_PINNED } from '../../workbenchDefaults';
import { WorkbenchProvider } from './WorkbenchProvider';
import { StatusBar } from './StatusBar';

function mount() {
  const services = createWorkbench({
    installed: localPlugins,
    persistence: noPersistence,
    defaultPinned: [...DEFAULT_PINNED],
    defaultAssistant: DEFAULT_ASSISTANT,
    defaultIntent: DEFAULT_INTENT,
  });
  render(
    <WorkbenchProvider services={services}>
      <StatusBar />
    </WorkbenchProvider>,
  );
  return services;
}

describe('the status bar', () => {
  it('collapses the sidebar through the command the menu and the key use', async () => {
    const user = userEvent.setup();
    const services = mount();
    // Not called through: were the button dispatching instead, the sidebar
    // would still collapse and the second assertion would catch it.
    const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);
    const dispatch = vi.spyOn(services.store, 'dispatch');

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(run).toHaveBeenCalledWith('workbench:sidebar', {}, 'user');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('announces the collapse, which a direct dispatch did not', async () => {
    const user = userEvent.setup();
    const services = mount();
    const announced: string[] = [];
    services.announcer.subscribe(() => announced.push(services.announcer.get().text));

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(services.store.get().sidebar.collapsed).toBe(true);
    expect(announced.at(-1)).toBe('Sidebar collapsed');
    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(services.store.get().sidebar.collapsed).toBe(false);
  });
});
