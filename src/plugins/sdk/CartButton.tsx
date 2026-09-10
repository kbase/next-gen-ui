import { CartButton as Control } from '@kbase/design-system';
import type { CartButtonProps as ControlProps } from '@kbase/design-system';
import { useCart } from './cart';
import type { CartItem } from './cart';

// Putting a thing in the cart, drawn the same way everywhere.
//
// The design system's CartButton decides the looks and the two forms: the
// icon pill for tables and tight rows, whose words appear on hover, and the
// labelled pill for a prominent placement. This binds it to the host's cart:
// the pressed state is whether the item is in the cart, pressing adds or
// takes it back out, and the accessible name says what is being carried.
// Callers that build their item lazily pass `id` and `onAdd` instead of
// `item`; either way the id is what "is this in the cart" is answered with.

export interface CartButtonProps extends Pick<ControlProps, 'labelled' | 'className' | 'disabled'> {
  // The item to add. Omit only when building it is expensive enough to defer,
  // in which case pass `id` and `onAdd`.
  item?: CartItem;
  id?: string;
  onAdd?: () => void;
  // What the button is adding, for the accessible name: "Add P0AEX9 to the
  // cart". The words shown stay the design system's short ones. Falls back
  // to the item's own name.
  subject?: string;
}

export function CartButton({ item, id, onAdd, subject, ...control }: CartButtonProps) {
  const cart = useCart();
  const key = item?.id ?? id;
  const added = key ? cart.has(key) : false;
  const what = subject ?? item?.subject ?? item?.name ?? 'this';
  return (
    <Control
      {...control}
      pressed={added}
      aria-label={control.labelled ? undefined : `Add ${what} to the cart`}
      onPressedChange={(next) => {
        if (!key) return;
        if (!next) cart.remove(key);
        else if (onAdd) onAdd();
        else if (item) cart.add(item);
      }}
    />
  );
}
