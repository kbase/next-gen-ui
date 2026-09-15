import { z } from 'zod';
import { MatchSchema } from './background';

// An item in the cart: a pointer plus what an assistant is told, never data.
// It crosses both ways — a plugin adds one and answers `relate` with them,
// and the host hands this plugin's own back out of `items()` — so it is the
// one shape a framed app usually mirrors, and the one worth validating on
// whichever side builds it. What to put in each field is in cart.ts, beside
// the handle that takes it.

// One of the adding plugin's commands, with the arguments that produce the
// item. The name is bare: `plugin` says whose it is, and a consumer
// qualifies it with `qualifyCommand` before running it. A pointer is a
// command and not a path, because whoever holds the item — the tray, the
// Related pane, an assistant — runs it through the host.
export const CartSourceSchema = z.object({
  command: z.string().min(1),
  args: z.record(z.string(), z.string()).optional(),
});
export type CartSource = z.infer<typeof CartSourceSchema>;

// What the host checks an item against where a plugin hands it over —
// `cart.add`, and every item `relate` answers with. `plugin` is not here:
// the host writes it, and an item that fails is refused to the plugin that
// sent it.
export const CartItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().optional(),
  summary: z.string().optional(),
  // Namespaced keys other plugins may recognise — `uniprot:P0AEX9`,
  // `taxon:562`. Optional and unpoliced: a plugin answers on the prefixes it
  // knows and stays silent on the rest, the same way `terms` does. This is
  // what lets a second plugin say something about an item without knowing
  // anything about the plugin that added it.
  terms: z.array(z.string()).optional(),
  // What this item was given for, on an item `relate` answers with: the
  // terms out of the query it answers, each with how the plugin came by it.
  // `terms` is what the item carries onward and `answers` is what it was
  // asked about, so an item may answer a term it does not carry and carry
  // terms nobody asked for. Evidence about a question, not a property of the
  // thing: what the Related pane adds to the cart is the item without it.
  answers: z.array(MatchSchema).optional(),
  source: CartSourceSchema.optional(),
  // What an assistant reads about the item and could not infer. Small: it
  // goes into a prompt.
  context: z.record(z.string(), z.unknown()).optional(),
});

export type CartItem = z.infer<typeof CartItemSchema> & {
  // Who added it. The host stamps this when the item enters the cart and it
  // cannot be set from a plugin — `Cart.add` does not take it, and what
  // `pluginHostFor` writes overrides whatever the object carried. Absent on
  // an item on its way in, including everything `relate` answers with, and
  // present on every item the cart hands back.
  readonly plugin?: string;
};
