import { CartButton as Control } from '@kbase/design-system';
import type { CartButtonProps as ControlProps } from '@kbase/design-system';
import { useCart } from './useCart';
import type { CartItem } from './useCart';

// Putting a thing in the cart, drawn the same way everywhere.
//
// The design system's CartButton decides the looks and the two forms: the
// icon pill for tables and tight rows, whose words appear on hover, and the
// labelled pill for a prominent placement. This binds it to the host's cart:
// the pressed state is whether the item is in the cart, pressing adds or
// takes it back out, and the accessible name says what is being carried.
//
// One cart throughout — the caller's own, from `useCart()`. Both halves of the
// button answer from it, so pressed means added and pressing again removes
// what the last press put there.

export interface CartButtonProps extends Pick<ControlProps, 'labelled' | 'className' | 'disabled'> {
  item: CartItem;
}

export function CartButton({ item, ...control }: CartButtonProps) {
  const cart = useCart();
  const what = item.subject ?? item.name;
  return (
    <Control
      {...control}
      pressed={cart.has(item.id)}
      aria-label={control.labelled ? undefined : `Add ${what} to the cart`}
      onPressedChange={(next) => {
        if (next) cart.add(item);
        else cart.remove(item.id);
      }}
    />
  );
}
