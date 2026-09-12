import type { PluginHost } from '../../plugins/sdk';
import { qualifyCommand } from '../../plugins/sdk';
import type { PluginId } from '../core';
import type { WorkbenchServices } from './services';
import { openRoute } from './open';

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
    cart: {
      add: (item) => services.cart.add({ ...item, plugin }),
      remove: (id) => {
        const own = services.cart.items().find((i) => i.id === id && i.plugin === plugin);
        if (own) services.cart.remove(id);
      },
      items: () => services.cart.items().filter((i) => i.plugin === plugin),
      has: (id) => services.cart.items().some((i) => i.id === id && i.plugin === plugin),
      count: () => services.cart.items().filter((i) => i.plugin === plugin).length,
      subscribe: (listener) => services.cart.subscribe(listener),
    },
  };
}
