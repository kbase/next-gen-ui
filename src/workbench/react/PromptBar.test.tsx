import { act, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { localPlugins } from '../../plugins/local';
import { koros } from '../../plugins/local/koros/store';
import { createWorkbench, noPersistence } from '../host';
import type { WorkbenchServices } from './services';
import { WorkbenchProvider } from './WorkbenchProvider';
import { PromptBar } from './PromptBar';

const workbench = () =>
  createWorkbench({
    installed: localPlugins,
    persistence: noPersistence,
    defaultPinned: ['koros', 'data', 'jobs'],
    defaultAssistant: 'koros',
    defaultIntent: 'intent',
  });

const bar = (services: WorkbenchServices) => (
  <WorkbenchProvider services={services}>
    <PromptBar />
  </WorkbenchProvider>
);

function mount() {
  const services = workbench();
  render(bar(services));
  return services;
}

const field = () => screen.getByRole('combobox', { name: 'Prompt' });

describe('sending a prompt', () => {
  it('empties the box and the cart once the assistant has the message', async () => {
    const user = userEvent.setup();
    const services = mount();
    act(() => services.cart.add({ id: 'a', plugin: 'data', name: 'one' }));

    await user.type(field(), 'hello{Enter}');

    expect(field()).toHaveValue('');
    expect(services.cart.items()).toEqual([]);
  });

  it('keeps the message and its attachments when the assistant module fails to load', async () => {
    const user = userEvent.setup();
    const services = mount();
    act(() => services.cart.add({ id: 'a', plugin: 'data', name: 'one' }));
    services.source.module = vi.fn().mockRejectedValue(new Error('offline'));

    await user.type(field(), 'hello{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('offline');
    expect(field()).toHaveValue('hello');
    expect(services.cart.items()).toMatchObject([{ id: 'a' }]);
  });

  it('keeps the message and its attachments when the assistant rejects the message', async () => {
    const user = userEvent.setup();
    const services = mount();
    act(() => services.cart.add({ id: 'a', plugin: 'data', name: 'one' }));
    services.source.module = vi.fn().mockResolvedValue({
      handle: vi.fn().mockRejectedValue(new Error('the assistant choked')),
      newConversation: vi.fn(),
    });

    await user.type(field(), 'hello{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('the assistant choked');
    expect(field()).toHaveValue('hello');
    expect(services.cart.items()).toMatchObject([{ id: 'a' }]);
  });
});

describe('the rows under the box', () => {
  const options = () => screen.getAllByRole('option').map((o) => o.textContent);

  // A pane is a module and not a command, and nothing in the Related
  // plugin's manifest is one either. It is reachable because the host hands
  // the intent the call that shows a pane alongside the declared commands —
  // the bar itself no longer reads the text at all.
  it('reaches a pane by the name of the plugin that has it', async () => {
    const user = userEvent.setup();
    const services = mount();
    const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);

    await user.type(field(), 'related');
    const row = await screen.findByRole('option', { name: /Show Related/ });

    // Under the Send row, which is always row zero.
    expect(options()[0]).toContain('Send to KOROS');
    await user.click(row);
    expect(run).toHaveBeenCalledWith('workbench:open', { plugin: 'related' }, 'user');
  });

  // The shortcut button's own label, which the ranker sees because the host
  // puts the call in the catalog; the command it runs is KOROS's own.
  it('reaches a shortcut button by its label, once', async () => {
    const user = userEvent.setup();
    const services = mount();
    const run = vi.spyOn(services.registry, 'run').mockResolvedValue(undefined);

    await user.type(field(), 'new question');
    const row = await screen.findByRole('option', { name: /New question/ });

    // The command KOROS declares and the button that calls it are one row:
    // pressing either would run the same thing with the same arguments.
    expect(options().filter((t) => t?.includes('New question'))).toHaveLength(1);
    await user.click(row);
    expect(run).toHaveBeenCalledWith('koros:new-question', {}, 'user');
  });

  it('offers nothing of its own when the chosen intent is not installed', async () => {
    const user = userEvent.setup();
    const services = mount();
    act(() => services.settings.set({ intent: 'uninstalled' }));

    await user.type(field(), 'related');

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});

describe('an assistant that is not installed', () => {
  const missing = () => {
    const services = mount();
    act(() => services.settings.set({ assistant: 'uninstalled' }));
    return services;
  };

  it('is named in the refusal rather than throwing', async () => {
    const user = userEvent.setup();
    missing();

    await user.type(field(), 'hello{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'uninstalled cannot answer prompts.',
    );
  });

  it('still names where the text would go', () => {
    missing();
    expect(screen.getByText('uninstalled')).toBeVisible();
  });
});

describe('the destination row', () => {
  // Moving the arc is the whole of it: the plugin pushes the new
  // destination, and the row redraws without the bar being re-rendered or a
  // command being run.
  it('follows the arc the plugin pushes', async () => {
    mount();
    const shown = () => screen.getByRole('button', { name: /^Prompt destination:/ }).textContent;
    expect(
      await screen.findByRole('button', { name: /^Prompt destination: Nitrogenase in isolate 12/ }),
    ).toBeVisible();

    act(() => koros.setCurrent('methanol-dh'));

    expect(shown()).toContain('Methanol dehydrogenase variants');

    act(() => koros.setCurrent('nitro'));
    expect(shown()).toContain('Nitrogenase in isolate 12');
  });

  // The point of holding the value in the host: the plugin is subscribed to
  // when its module arrives, before anything renders, so the row is drawn
  // from a value the bar already has. A single server pass runs no effects,
  // so nothing can repair what it produces — the label is in the markup or
  // the first render did not have it.
  it('is drawn on the first render, from a value the host already holds', async () => {
    const services = workbench();
    // Control: the same render, before the plugin's module has arrived, has
    // no row to draw — so what the second pass shows came from the store.
    expect(renderToStaticMarkup(bar(services))).not.toContain('Prompt destination:');

    await vi.waitFor(() =>
      expect(services.destination.get()?.label).toBe('Nitrogenase in isolate 12'),
    );

    expect(renderToStaticMarkup(bar(services))).toContain(
      'aria-label="Prompt destination: Nitrogenase in isolate 12. Change destination"',
    );
  });

  it('drops the destination when the assistant changes', async () => {
    const services = workbench();
    await vi.waitFor(() => expect(services.destination.get()).not.toBeNull());

    // Jobs has no prompt module, so nothing replaces what KOROS pushed —
    // and what KOROS pushed is not shown under another assistant's name.
    services.settings.set({ assistant: 'jobs' });

    expect(services.destination.get()).toBeNull();
  });

  it('stops the plugin and drops the value when the store stops', async () => {
    const services = workbench();
    await vi.waitFor(() => expect(services.destination.get()).not.toBeNull());

    services.destination.stop();

    expect(services.destination.get()).toBeNull();
    // The plugin's push no longer reaches the store.
    koros.setCurrent('methanol-dh');
    expect(services.destination.get()).toBeNull();
    koros.setCurrent('nitro');
  });
});
