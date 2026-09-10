import { createContext, useContext } from 'react';
import type { Cart } from './cart';

// What a plugin may ask the workbench to do: open its own route, run a
// command — its own by bare name, another plugin's by "plugin:name" — say
// something when nothing on screen changed, and set things aside in the cart.
export interface PluginHost {
  // This plugin's page at a path. A panel already showing the same page,
  // as the route's `normalize` judges it, is focused instead of a second
  // one opening; `duplicate` asks for the second one anyway.
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;
  // Resolves when the handler resolves, with nothing: data between plugins
  // travels as terms and cart items, not as return values.
  execute: (command: string, args?: Record<string, string | number>) => Promise<void>;
  hasCommand: (command: string) => boolean;
  // A toast. For the outcome only the plugin can see: a command that ran and
  // changed nothing visible, a neighbour that is not installed.
  notify: (text: string) => void;
  // The cart is the host's; a plugin adds to it and reads whether a thing of
  // its own is in it. Reached through `useCart()` rather than directly, so a
  // plugin does not have to hold the handle.
  cart: Cart;
}

export const HostContext = createContext<PluginHost | null>(null);

export function useHost(): PluginHost {
  const host = useContext(HostContext);
  if (!host) throw new Error('useHost() called outside a workbench panel');
  return host;
}
