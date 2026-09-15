import { useSyncExternalStore } from 'react';
import { CartItemSchema, CartSourceSchema } from './boundary/cart';
import type { CartItem, CartSource } from './boundary/cart';
import { useHost } from './host';

// Adding something to the cart, from inside a plugin.
//
//   const cart = useCart();
//   <Button onClick={() => cart.add({ ... })}>Add to cart</Button>
//
// What to put in an item — the part that matters, because the host cannot
// check it and an assistant cannot ask for more:
//
//   id       Derive it from what the thing *is*, so adding twice is the same
//            item: `function-junction:protein:P0AEX9`, not a counter. Re-adding
//            replaces, which is how a plugin refreshes a stale payload.
//
//   name     What the user would call it, not an accession, if you have both.
//            It is what the tray's tooltip shows; the tile itself shows the
//            summary, and wears your plugin's logo rather than a mark of its
//            own.
//
//   subject  What it is about, when that differs from the item itself — the
//            protein an evidence line came from, the genome a run used. The
//            tile leads with this and the figure sits under it, so an item
//            whose summary is a bare number still says what of.
//
//   terms    Namespaced keys anything else might recognise:
//            `uniprot:P0AEX9`, `taxon:562`. They are how the workbench asks
//            other plugins what relates to this item — omit them and the item
//            is still a cart item, just an isolated one.
//
//   context  What an assistant reads about the item and could not infer —
//            units, the population a number was measured over, how the
//            evidence was reached, the caveats you would print beside it.
//            Small: it goes into a prompt.
//
//   answers  Answering `relate`: which of the terms you were asked about this
//            item answers, and how — the same `{ term, kind }` an offer
//            carries. Related reads it out on the row: "genKnown, because your
//            cart has P11558". Name every term the item answers, not the first
//            one you looked up: one node usually arrives under two spellings
//            at once, an id and a name, and an item that keeps one of them
//            explains itself only half the time.
//
//   source   The command that produces the thing again, with its arguments.
//            Give a command any plugin could be asked to run, not the one
//            behind a button of yours: whoever holds the item — the tray, the
//            Related pane, an assistant — runs it through the host, and a
//            command is the only pointer they can follow.
//
// The item carries no data. What it names is fetched by whoever consumes it,
// through the terms and the source, from where the data lives.

export { CartItemSchema, CartSourceSchema };
export type { CartItem, CartSource };

// The slice of the host's cart a plugin can see. It cannot read other
// plugins' items: what is in the cart is the user's business and the
// assistant's, and a plugin that could read it could fingerprint the session.
export interface Cart {
  // Same id replaces. The stamp is the host's: an item goes in without a
  // `plugin` and comes back out of `items()` with this plugin's id on it.
  add: (item: Omit<CartItem, 'plugin'>) => void;
  remove: (id: string) => void;
  // This plugin's items only: what it added, as the host holds them, so a
  // page can rebuild its own controls after a reload.
  items: () => readonly CartItem[];
  has: (id: string) => boolean;
  count: () => number;
  subscribe: (listener: () => void) => () => void;
}

// The host's cart handle, re-rendering the caller on change so a button
// that reads `has()` updates when the user removes the item from the tray
// rather than from the button. Outside a panel it throws, like `useHost()`.
export function useCart(): Cart {
  const { cart } = useHost();
  // Subscribed only to force the re-render: `count()` is the cheapest
  // snapshot that moves when this plugin's slice gains or loses an item.
  useSyncExternalStore(cart.subscribe, cart.count);
  return cart;
}
