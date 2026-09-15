import type { PluginHost } from '@kbase/plugin-sdk';
import {
  ArgValuesSchema,
  CartItemSchema,
  NoticeSchema,
  PathSchema,
  qualifyCommand,
} from '@kbase/plugin-sdk';
import type { PluginId } from '../core';
import { taken } from './checked';
import type { WorkbenchServices } from './services';
import { openRoute } from './open';

// What `cart.add` takes: the item as the SDK declares it, less the evidence
// an answer to `relate` carries, which the cart has no field for.
const SentItem = CartItemSchema.omit({ answers: true });

// What a plugin's code may do to the workbench, scoped to that plugin.
//
// Everything a plugin hands over is checked against the SDK's schema for it
// (plugins/sdk/boundary) before the workbench acts on it, and a value that
// fails is refused to the call that sent it — the plugin's own frame is on
// the stack, so it is the one that can say what it meant. This is the other
// half of `accepted`, which the host uses on what it asked a plugin for:
// there the plugin has already returned and there is nobody to throw to, so
// the value is dropped with a line naming it.
export function pluginHostFor(services: WorkbenchServices, plugin: PluginId): PluginHost {
  const who = `plugin ${plugin}`;
  return {
    openRoute: (path, options) =>
      void openRoute(services, plugin, taken(who, 'openRoute refused the path', PathSchema, path), options),
    // A bare name is this plugin's own command; another plugin's is named in
    // full. The caller is recorded so a handler can tell a keystroke from a
    // neighbour acting for someone.
    execute: async (command, args = {}) => {
      const name = qualifyCommand(command, plugin);
      await services.registry.run(
        name,
        taken(who, `execute refused the arguments for /${name}`, ArgValuesSchema, args),
        plugin,
      );
    },
    hasCommand: (command) => services.registry.get(qualifyCommand(command, plugin)) !== undefined,
    notify: (text) =>
      void services.toasts.add({ title: taken(who, 'notify refused the text', NoticeSchema, text) }),
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
    // Nothing the store holds has a shape the host did not check, which is
    // why the stored cart is read whole (core/cart.ts).
    cart: {
      add: (item) => {
        services.cart.add({ ...taken(who, 'cart.add refused the item', SentItem, item), plugin });
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
