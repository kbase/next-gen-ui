import { z } from 'zod';
import type { CartItem } from '../../plugins/sdk';
import { createKeyedStore } from './subscribable';

// Things the user has set aside to work with.
//
// A cart item is a pointer with a caption: what the thing is, how to get back
// to it, and what an assistant needs to know before reasoning about it. It
// carries no data. The data stays where it lives and is fetched by whoever
// consumes the item, through the terms and the source, so nothing large moves
// through the page, its storage, or a prompt.
//
// The host owns the cart, because items come from plugins and are consumed by
// assistants and neither can hold state the other reaches. It is plain JSON for
// the same reason it is host-owned: it is written to storage now and may be
// synced to an account later, and neither is possible if an item can hold a
// function, a DOM node, or a class instance.
//
// The SDK's item and this one are one thing at two moments, so this one is
// derived: an item a plugin hands over (`plugins/sdk/cart.ts`) and the same
// item once the cart holds it. The stamp is what the moment adds — `plugin` is
// optional in flight and certain here — and the evidence is what it drops:
// `answers` says which of the terms a question carried this item answered, and
// the cart is not a question, so the schema below has no field for it and
// storage never sees one.
export type StoredCartItem = Omit<CartItem, 'plugin' | 'answers'> & { plugin: string };

// What `satisfies` holds to: anything this parses is an item the rest of the
// workbench can hold, so a field the SDK adds reaches storage or fails here.
export const CartItemSchema = z.object({
  // Stable and content-derived, so adding the same thing twice is idempotent
  // rather than a second copy. A plugin builds it from what the item *is* —
  // `function-junction:protein:P0AEX9` — not from a counter or a timestamp.
  id: z.string().min(1),
  // The plugin that added it, stamped by the host on the way in. Its manifest
  // supplies the icon and colour if the item names none, so items from one
  // tool look like each other; and it is what qualifies `source.command`, so
  // an item from one plugin can be followed by another.
  plugin: z.string().min(1),
  // What a person calls it.
  name: z.string().min(1),
  // What the item is *about*, if that is a different thing from the item: the
  // protein an evidence line was read off, the genome a job ran against. The
  // tile leads with it, because a figure without its subject — `2 small
  // molecules` — is not something a reader can act on.
  subject: z.string().optional(),
  // One line a person reads on the chip's tooltip and an assistant reads first.
  summary: z.string().optional(),
  // Namespaced keys another plugin may recognise (`uniprot:P0AEX9`). The
  // workbench asks with them; it never interprets them.
  terms: z.array(z.string()).optional(),

  // How to get back to it: one of the adding plugin's commands, named bare,
  // with the arguments that produce the item again. A command and not a path,
  // because anyone holding the item can run `plugin:command` through the host
  // — a path can be opened only by the plugin whose route it is, which left
  // every consumer but the adding plugin with nothing to press.
  source: z
    .object({
      command: z.string(),
      args: z.record(z.string(), z.string()).optional(),
    })
    .optional(),

  // What an assistant reads about the item and could not infer: units, the
  // population a number was measured over, the route the evidence took, the
  // caveats the builder attached. Small, because it goes into a prompt. The
  // item carries no data: a consumer fetches what the terms and the source
  // name from where it lives.
  context: z.record(z.string(), z.unknown()).optional(),
}) satisfies z.ZodType<StoredCartItem>;

export interface CartStore {
  items: () => readonly StoredCartItem[];
  // Idempotent on `id`: adding the same thing twice replaces it, so a plugin
  // may re-add to refresh a payload without the user seeing a duplicate.
  add: (item: StoredCartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

export const CART_STORAGE_KEY = 'kbase-workbench-cart.v4';

// A stored cart that does not match the schema is an empty cart, not a
// crash: the key names the shape, every item is checked against the SDK's
// schema where a plugin hands it over (host/pluginHost.ts), so anything under
// the key was written by a build that agreed on `CartItemSchema`, and anything
// that disagrees is damage.
export function readCart(raw: string | null): StoredCartItem[] {
  if (!raw) return [];
  try {
    const parsed = z.array(CartItemSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function createCartStore(initial: StoredCartItem[] = []): CartStore {
  const items = createKeyedStore<string, StoredCartItem>({
    initial: initial.map((i) => [i.id, i]),
  });
  return {
    items: () => items.entries().map(([, item]) => item),
    add: (item) => items.set(item.id, item),
    remove: items.forget,
    clear: items.clear,
    has: items.has,
    version: items.version,
    subscribe: items.subscribe,
  };
}
