import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CartButton } from './CartButton';
import { HostContext } from '../hooks/useHost';
import type { PluginHost } from '../hooks/useHost';
import type { CartItem } from '../hooks/useCart';

// A host whose cart is a map: enough for the binding, which reads `has`,
// calls `add` and `remove`, and re-renders on `subscribe`.
function host(): PluginHost {
  const items = new Map<string, CartItem>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    openRoute: () => {},
    execute: async () => {},
    hasCommand: () => false,
    notify: () => {},
    cart: {
      add: (item) => {
        items.set(item.id, item);
        notify();
      },
      remove: (id) => {
        items.delete(id);
        notify();
      },
      items: () => [...items.values()],
      has: (id) => items.has(id),
      count: () => items.size,
      subscribe: (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
    },
    frames: { container: document.createElement('div'), attach: () => () => {} },
  };
}

describe('the SDK CartButton', () => {
  it('is pressed when the item is in the cart, and pressing adds and removes it', async () => {
    const user = userEvent.setup();
    const h = host();
    render(
      <HostContext value={h}>
        <CartButton item={{ id: 'p', name: 'P0AEX9' }} />
      </HostContext>,
    );
    const button = screen.getByRole('button', { name: 'Add P0AEX9 to the cart' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(h.cart.has('p')).toBe(true);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(h.cart.has('p')).toBe(false);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('says what it is carrying by the item’s subject, which is the identifier', async () => {
    const user = userEvent.setup();
    const h = host();
    render(
      <HostContext value={h}>
        <CartButton item={{ id: 'q', name: 'Nitrogenase iron protein', subject: 'nifH' }} />
      </HostContext>,
    );
    await user.click(screen.getByRole('button', { name: 'Add nifH to the cart' }));
    expect(h.cart.items().map((i) => i.id)).toEqual(['q']);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
