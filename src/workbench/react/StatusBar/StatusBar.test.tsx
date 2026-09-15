import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StatusItem } from '@kbase/plugin-sdk';
import { defineBackground } from '@kbase/plugin-sdk';
import { localPlugins } from '../../../plugins/local';
import type { InstalledPlugin } from '../../host';
import { localPlugin, noPersistence } from '../../host';
import { createWorkbench } from '../../compose';
import { DEFAULT_ASSISTANT, DEFAULT_INTENT, DEFAULT_PINNED } from '../../../workbenchDefaults';
import { WorkbenchProvider } from '../WorkbenchProvider';
import { StatusBar } from './StatusBar';

function mount(installed: InstalledPlugin[] = localPlugins) {
  const services = createWorkbench({
    installed,
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

// A plugin that keeps the `set` it was handed and pushes when its own
// answer lands, which is what a line fetched from a server does.
function waitingPlugin() {
  let push: ((items: StatusItem[]) => void) | null = null;
  return {
    installed: localPlugin({
      config: { id: 'atlas', title: 'Atlas' },
      background: () =>
        Promise.resolve(
          defineBackground({
            status: (set) => {
              push = set;
              return () => {
                push = null;
              };
            },
          }),
        ),
    }),
    push: (items: StatusItem[]) => push?.(items),
    stopped: () => push === null,
  };
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

  it('shows a line the plugin pushes, with nothing run to ask for it', async () => {
    const atlas = waitingPlugin();
    const services = mount([atlas.installed]);
    const run = vi.spyOn(services.registry, 'run');
    // The background module arrives on a microtask; the store subscribes to
    // it as it does.
    await act(async () => {});
    expect(screen.queryByText('Lakehouse warm')).not.toBeInTheDocument();

    act(() => atlas.push([{ text: 'Lakehouse warm' }]));

    expect(screen.getByText('Lakehouse warm')).toBeInTheDocument();
    expect(run).not.toHaveBeenCalled();
  });

  it('drops the line and stops the plugin when the store stops', async () => {
    const atlas = waitingPlugin();
    const services = mount([atlas.installed]);
    await act(async () => {});
    act(() => atlas.push([{ text: 'Lakehouse warm' }]));

    act(() => services.status.stop());

    expect(screen.queryByText('Lakehouse warm')).not.toBeInTheDocument();
    expect(atlas.stopped()).toBe(true);
  });
});
