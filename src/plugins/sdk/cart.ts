import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import type { Match } from './contract';
import { MatchSchema } from './contract';
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

// One of the adding plugin's commands, with the arguments that produce the
// item. The name is bare: `plugin` says whose it is, and a consumer qualifies
// it with `qualifyCommand` before running it.
export interface CartSource {
  command: string;
  args?: Record<string, string>;
}

export interface CartItem {
  id: string;
  // Who added it. The host stamps this when the item enters the cart and it
  // cannot be set from a plugin — `Cart.add` does not take it, and what
  // `pluginHostFor` writes overrides whatever the object carried. Absent on an
  // item on its way in, including everything `relate` answers with, and
  // present on every item the cart hands back.
  readonly plugin?: string;
  name: string;
  subject?: string;
  summary?: string;
  // Namespaced keys other plugins may recognise — `uniprot:P0AEX9`,
  // `taxon:562`. Optional and unpoliced: a plugin answers on the prefixes it
  // knows and stays silent on the rest, the same way `terms` does. This is
  // what lets a second plugin say something about an item without knowing
  // anything about the plugin that added it.
  terms?: string[];
  // What this item was given for, on an item `relate` answers with: the terms
  // out of the query it answers, each with how the plugin came by it, in the
  // shape an offer's evidence has (`Match`). `terms` is what the item carries
  // onward and `answers` is what it was asked about, so an item may answer a
  // term it does not carry and carry terms nobody asked for.
  //
  // Evidence about a question, not a property of the thing: the Related pane
  // reads it off the answer, and what it adds to the cart is the item without
  // it. An item already in the cart answers nothing.
  answers?: Match[];
  source?: CartSource;
  context?: Record<string, unknown>;
}

// What the host checks an item against where a plugin hands it over —
// `cart.add`, and every item `relate` answers with. `plugin` is not here: the
// host writes it. An item that fails is refused to the plugin that sent it.
export const CartSourceSchema = z.object({
  command: z.string().min(1),
  args: z.record(z.string(), z.string()).optional(),
}) satisfies z.ZodType<CartSource>;

export const CartItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().optional(),
  summary: z.string().optional(),
  terms: z.array(z.string()).optional(),
  answers: z.array(MatchSchema).optional(),
  source: CartSourceSchema.optional(),
  context: z.record(z.string(), z.unknown()).optional(),
}) satisfies z.ZodType<Omit<CartItem, 'plugin'>>;

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
