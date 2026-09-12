import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { localPlugins } from '../../plugins/local';
import { createWorkbench, noPersistence } from '../host';
import { WorkbenchProvider } from './WorkbenchProvider';
import { PromptBar } from './PromptBar';

function mount() {
  const services = createWorkbench({
    installed: localPlugins,
    persistence: noPersistence,
    defaultPinned: ['koros', 'data', 'jobs'],
    defaultAssistant: 'koros',
  });
  render(
    <WorkbenchProvider services={services}>
      <PromptBar />
    </WorkbenchProvider>,
  );
  return services;
}

const field = () => screen.getByRole('combobox', { name: 'Prompt' });

describe('sending a prompt', () => {
  it('empties the box and the cart once the assistant has the message', async () => {
    const user = userEvent.setup();
    const services = mount();
    act(() => services.cart.add({ id: 'a', plugin: 'data', name: 'one', addedAt: 1 }));

    await user.type(field(), 'hello{Enter}');

    expect(field()).toHaveValue('');
    expect(services.cart.items()).toEqual([]);
  });

  it('keeps the message and its attachments when the assistant module fails to load', async () => {
    const user = userEvent.setup();
    const services = mount();
    act(() => services.cart.add({ id: 'a', plugin: 'data', name: 'one', addedAt: 1 }));
    services.source.module = vi.fn().mockRejectedValue(new Error('offline'));

    await user.type(field(), 'hello{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('offline');
    expect(field()).toHaveValue('hello');
    expect(services.cart.items()).toMatchObject([{ id: 'a' }]);
  });

  it('keeps the message and its attachments when the assistant rejects the message', async () => {
    const user = userEvent.setup();
    const services = mount();
    act(() => services.cart.add({ id: 'a', plugin: 'data', name: 'one', addedAt: 1 }));
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
