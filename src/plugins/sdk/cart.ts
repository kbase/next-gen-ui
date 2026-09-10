import { useCallback, useContext, useSyncExternalStore } from 'react';
import { HostContext } from './host';

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
//   source   How to get back to the thing: the path that reopens your route
//            on it, or a command that produces it again.
//
// The item carries no data. What it names is fetched by whoever consumes it,
// through the terms and the source, from where the data lives.

// A path on the adding plugin's route, or one of its commands with the
// arguments that produce the item. A bare command name is the plugin's own.
export type CartSource =
  | { path: string }
  | { command: string; args?: Record<string, string | number> };

export interface CartItem {
  id: string;
  name: string;
  subject?: string;
  summary?: string;
  // Namespaced keys other plugins may recognise — `uniprot:P0AEX9`,
  // `taxon:562`. Optional and unpoliced: a plugin answers on the prefixes it
  // knows and stays silent on the rest, the same way `terms` does. This is
  // what lets a second plugin say something about an item without knowing
  // anything about the plugin that added it.
  terms?: string[];
  source?: CartSource;
  context?: Record<string, unknown>;
}

// The slice of the host's cart a plugin can see. It cannot read other
// plugins' items: what is in the cart is the user's business and the
// assistant's, and a plugin that could read it could fingerprint the session.
export interface Cart {
  // Same id replaces.
  add: (item: CartItem) => void;
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
// rather than from the button.
export function useCart(): Cart {
  const host = useContext(HostContext);
  const cart = host?.cart;
  useSyncExternalStore(
    useCallback((cb: () => void) => cart?.subscribe(cb) ?? (() => {}), [cart]),
    () => cart?.count() ?? 0,
    () => 0,
  );
  const add = useCallback((item: CartItem) => cart?.add(item), [cart]);
  const remove = useCallback((id: string) => cart?.remove(id), [cart]);
  const items = useCallback(() => cart?.items() ?? [], [cart]);
  const has = useCallback((id: string) => cart?.has(id) ?? false, [cart]);
  const count = useCallback(() => cart?.count() ?? 0, [cart]);
  const subscribe = useCallback(
    (listener: () => void) => cart?.subscribe(listener) ?? (() => {}),
    [cart],
  );
  return { add, remove, items, has, count, subscribe };
}
