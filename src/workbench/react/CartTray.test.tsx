import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { localPlugins } from '../../plugins/local';
import { definePluginManifest } from '@kbase/plugin-sdk';
import { localPlugin, noPersistence } from '../host';
import { createWorkbench } from '../compose';
import { WorkbenchProvider } from './WorkbenchProvider';
import { PromptBar } from './PromptBar';
import { CartTray } from './CartTray';
import promptStyles from '../../design-system/components/PromptInput/PromptInput.module.scss';
import { DEFAULT_ASSISTANT, DEFAULT_INTENT, DEFAULT_PINNED } from '../../workbenchDefaults';

function mount(
  items: {
    id: string;
    plugin: string;
    name: string;
    subject?: string;
    summary?: string;
    context?: Record<string, unknown>;
  }[],
) {
  // These tests are about the tray's own rendering, not the sidebar, so
  // there is nothing here for a non-default layout to be about.
  const services = createWorkbench({
    installed: localPlugins,
    persistence: noPersistence,
    defaultPinned: [...DEFAULT_PINNED],
    defaultAssistant: DEFAULT_ASSISTANT,
    defaultIntent: DEFAULT_INTENT,
  });
  items.forEach((i) => services.cart.add(i));
  render(
    <WorkbenchProvider services={services}>
      <CartTray />
    </WorkbenchProvider>,
  );
  return services;
}

describe('the cart tray', () => {
  it('names each item on its plugin logo rather than on the tile', async () => {
    const user = userEvent.setup();
    mount([
      {
        id: 'a',
        plugin: 'data',
        name: 'Rhodobacter reads',
        subject: 'GCF_000012905.2',
        summary: '4.2 GB',
      },
    ]);

    // The tile shows what it is about and the figure it was added for; the
    // name is behind the logo.
    expect(screen.getByText('GCF_000012905.2')).toBeInTheDocument();
    expect(screen.getByText('4.2 GB')).toBeInTheDocument();
    expect(screen.queryByText('Rhodobacter reads')).not.toBeInTheDocument();

    const tile = screen.getByRole('button', { name: /Open Rhodobacter reads/ });
    await user.hover(tile.querySelector('svg')!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Rhodobacter reads');
  });

  it('gives two items from one plugin the same mark', () => {
    mount([
      { id: 'a', plugin: 'data', name: 'one' },
      { id: 'b', plugin: 'data', name: 'two' },
      { id: 'c', plugin: 'jobs', name: 'three' },
    ]);
    const marks = screen
      .getAllByRole('listitem')
      .map((tile) => tile.querySelector('svg')?.innerHTML);
    expect(marks[0]).toBe(marks[1]);
    expect(marks[0]).not.toBe(marks[2]);
  });

  it('leads with the name when an item is about nothing but itself', () => {
    mount([{ id: 'a', plugin: 'data', name: 'one', summary: '4.2 GB' }]);
    expect(screen.getByText('one')).toBeInTheDocument();
  });

  it('scrolls sideways rather than growing the composer', () => {
    mount([{ id: 'a', plugin: 'data', name: 'one' }]);
    const row = screen.getByRole('list', { name: 'Cart, 1 items' });
    expect(getComputedStyle(row).flexWrap).not.toBe('wrap');
  });

  // The tray belongs to no plugin, so the only pointer it can follow is a
  // command: it qualifies the item's own with the plugin stamped on the item.
  it('runs an item’s command in the plugin that added it', async () => {
    const user = userEvent.setup();
    const ran = vi.fn();
    const services = createWorkbench({
      // Named because a workbench is built with both chosen; this test types
      // nothing into the prompt bar.
      defaultAssistant: 'koros',
      defaultIntent: 'intent',
      installed: [
        localPlugin({
          config: definePluginManifest({
            id: 'gk',
            title: 'genKnown',
            description: 'A plugin with a command and no page of its own here.',
            icon: 'Code',
            commands: [{ name: 'open', title: 'Open a taxon' }],
          }),
          commands: () => Promise.resolve({ open: ran }),
        }),
      ],
      persistence: noPersistence,
    });
    act(() =>
      services.cart.add({
        id: 'gk:83333',
        plugin: 'gk',
        name: 'Escherichia coli',
        source: { command: 'open', args: { q: '83333' } },
      }),
    );
    render(
      <WorkbenchProvider services={services}>
        <CartTray />
      </WorkbenchProvider>,
    );

    await user.click(screen.getByRole('button', { name: /Open Escherichia coli/ }));
    await user.click(await screen.findByRole('button', { name: 'Run /open' }));
    expect(ran).toHaveBeenCalledWith({ q: '83333' }, expect.objectContaining({ caller: 'user' }));
  });

  it('opens the item, context and all, when its tile is pressed', async () => {
    const user = userEvent.setup();
    mount([
      {
        id: 'a',
        plugin: 'data',
        name: 'one',
        summary: '4.2 GB',
        context: { measuredOver: '41 contigs' },
      },
    ]);
    await user.click(screen.getByRole('button', { name: /Open one/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('one')).toBeInTheDocument();
    expect(within(dialog).getByText(/"measuredOver"/)).toBeInTheDocument();
  });

  // Emptying the tray throws away work that took several presses to collect
  // and cannot be undone, so it asks first.
  it('empties only after the removal is confirmed', async () => {
    const user = userEvent.setup();
    const services = mount([
      { id: 'a', plugin: 'data', name: 'one' },
      { id: 'b', plugin: 'jobs', name: 'two' },
    ]);
    await user.click(screen.getByRole('button', { name: 'Remove all' }));
    expect(services.cart.items()).toHaveLength(2);

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(services.cart.items()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Remove all' }));
    await user.click(await screen.findByRole('button', { name: 'Remove 2 items' }));
    expect(services.cart.items()).toEqual([]);
  });

  it('takes an item out when its remove control is pressed', async () => {
    const user = userEvent.setup();
    const services = mount([{ id: 'a', plugin: 'data', name: 'one' }]);
    await user.click(screen.getByRole('button', { name: 'Remove one from the cart' }));
    expect(services.cart.items()).toHaveLength(0);
  });

  // An empty cart is no cart: the composer's attachments row is a bordered,
  // padded strip, and opening it around nothing is worse than not having it.
  it('leaves no trace in the composer when it is empty', () => {
    const services = createWorkbench({
      installed: localPlugins,
      persistence: noPersistence,
      defaultPinned: [...DEFAULT_PINNED],
      defaultAssistant: DEFAULT_ASSISTANT,
      defaultIntent: DEFAULT_INTENT,
    });
    const { container } = render(
      <WorkbenchProvider services={services}>
        <PromptBar />
      </WorkbenchProvider>,
    );
    expect(screen.queryByRole('list', { name: /Cart/ })).toBeNull();
    expect(container.querySelector(`.${promptStyles.attachments}`)).toBeNull();

    act(() => services.cart.add({ id: 'a', plugin: 'data', name: 'one' }));
    expect(screen.queryByRole('list', { name: /Cart/ })).not.toBeNull();
    expect(container.querySelector(`.${promptStyles.attachments}`)).not.toBeNull();
  });
});
