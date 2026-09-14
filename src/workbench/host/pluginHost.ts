import type { PluginHost } from '../../plugins/sdk';
import { CartItemSchema, qualifyCommand } from '../../plugins/sdk';
import type { PluginId } from '../core';
import { issueText } from './checked';
import type { WorkbenchServices } from './services';
import { openRoute } from './open';

// What `cart.add` takes: the item as the SDK declares it, less the evidence
// an answer to `relate` carries, which the cart has no field for.
const SentItem = CartItemSchema.omit({ answers: true });

// What a plugin's code may do to the workbench, scoped to that plugin.
export function pluginHostFor(services: WorkbenchServices, plugin: PluginId): PluginHost {
  return {
    openRoute: (path, options) => void openRoute(services, plugin, path, options),
    // A bare name is this plugin's own command; another plugin's is named in
    // full. The caller is recorded so a handler can tell a keystroke from a
    // neighbour acting for someone.
    execute: async (command, args = {}) => {
      await services.registry.run(qualifyCommand(command, plugin), args, plugin);
    },
    hasCommand: (command) => services.registry.get(qualifyCommand(command, plugin)) !== undefined,
    notify: (text) => void services.toasts.add({ title: text }),
    // Scoped to the adding plugin: it stamps its own id on what it adds, and
    // `has` and `count` answer about its own items only. What else is in the
    // cart is the user's business and the assistant's.
    //
    // The stamp is this one line, and it is the whole of who-added-what: it is
    // written after the item's own fields, so a `plugin` on the object is
    // overwritten rather than believed. Everything that follows an item back —
    // the tray, Related, an assistant — qualifies `source.command` with it, so
    // a forged stamp would run another plugin's command.
    //
    // The item is checked here, where the plugin hands it over, and refused
    // to the plugin's own call: nothing the store holds has a shape it did
    // not check, so the stored cart is read whole (core/cart.ts).
    cart: {
      add: (item) => {
        const parsed = SentItem.safeParse(item);
        if (!parsed.success) {
          throw new TypeError(
            `plugin ${plugin}: cart.add refused the item: ${issueText(parsed.error.issues)}`,
          );
        }
        services.cart.add({ ...parsed.data, plugin });
      },
      remove: (id) => {
        const own = services.cart.items().find((i) => i.id === id && i.plugin === plugin);
        if (own) services.cart.remove(id);
      },
      items: () => services.cart.items().filter((i) => i.plugin === plugin),
      has: (id) => services.cart.items().some((i) => i.id === id && i.plugin === plugin),
      count: () => services.cart.items().filter((i) => i.plugin === plugin).length,
      subscribe: (listener) => services.cart.subscribe(listener),
    },
    frames: services.frames,
  };
}
