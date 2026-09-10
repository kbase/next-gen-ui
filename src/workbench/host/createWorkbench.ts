import { createToastManager } from '@kbase/design-system';
import type { PluginHost } from '../../plugins/sdk';
import { qualifyCommand } from '../../plugins/sdk';
import type { PluginId } from '../core';
import {
  CART_STORAGE_KEY,
  createCartStore,
  createQueryStore,
  createTermStore,
  createWorkbenchStore,
  defaultLayout,
  deserialize,
  introduce,
  readCart,
  serialize,
} from '../core';
import type { Command } from '../commands';
import { createCommandRegistry, createRunStore, workbenchCommands } from '../commands';
import { createAnnouncer, createCrumbStore, createTitleStore } from '../react';
import type { WorkbenchServices } from '../react';
import { fallbackTitle } from '../react/context';
import { createPreviewHandle, createPromptHandle } from '../react/services';
import type { InstalledPlugin } from './installed';
import { createHostIndex } from './installed';
import { openPane, openRoute } from './open';
import { hostPlugins } from './pages';
import { createQueryRunner } from './query/runner';
import { createSettingsStore } from './settings';
import { createStatusStore } from './status';

export const LAYOUT_STORAGE_KEY = 'workbench.layout.v2';

// Keys earlier builds wrote. Removed on boot rather than read: a layout or
// cart from before the contract change is not migrated, and leaving it in
// storage would only let a later build find it.
const RETIRED_STORAGE_KEYS = ['workbench.layout.v1', 'kbase-workbench-cart'];

export interface CreateWorkbenchOptions {
  installed: InstalledPlugin[];
  // null for tests and for a browser with storage disabled.
  storage: Storage | null;
  defaultPinned?: PluginId[];
  // The plugin whose prompt module answers the bar until the user picks.
  defaultAssistant?: PluginId | null;
  // The plugin whose intent module suggests commands until the user picks.
  defaultIntent?: PluginId | null;
}

// Builds the store, the command registry and their companions once, before
// React mounts. The layout is read from storage here so the first render is
// already the restored one.
export function createWorkbench({
  installed,
  storage,
  defaultPinned = [],
  defaultAssistant = null,
  defaultIntent = null,
}: CreateWorkbenchOptions): WorkbenchServices {
  const titles = createTitleStore();
  const crumbs = createCrumbStore();
  const announcer = createAnnouncer();
  const prompt = createPromptHandle();
  const preview = createPreviewHandle();
  const focusIntentRef: WorkbenchServices['focusIntentRef'] = { current: 'command' };
  const navIntentRef: WorkbenchServices['navIntentRef'] = { current: 'push' };
  const source = createHostIndex([...installed, ...hostPlugins(() => services)]);
  const settings = createSettingsStore(storage, {
    assistant: defaultAssistant,
    intent: defaultIntent,
  });
  for (const key of RETIRED_STORAGE_KEYS) {
    try {
      storage?.removeItem(key);
    } catch {
      // Privacy mode; there is nothing there to retire.
    }
  }
  // The cart is host state, not layout: it survives a layout reset, and it is
  // the thing most likely to move to the account later.
  const cart = createCartStore(readCart(storage?.getItem(CART_STORAGE_KEY) ?? null));

  const fallback = () => defaultLayout({ pinned: defaultPinned });
  const saved = deserialize(read(storage), fallback);
  // `introduce` is what makes a newly added host block appear for someone
  // whose layout predates it; the saved layout is otherwise restored verbatim,
  // and defaultPinned only ever builds a fresh one.
  const initial = introduce(saved, defaultPinned);
  const store = createWorkbenchStore({
    initial,
    title: (id, panel) => titles.get(id) ?? fallbackTitle(services, panel, id),
  });

  const registry = createCommandRegistry();
  const runs = createRunStore();
  const toasts = createToastManager();
  const dispatch: WorkbenchServices['dispatch'] = (op) => {
    const result = store.dispatch(op);
    if (result.changed) announcer.announce(result.announcement);
    return result.changed;
  };
  const query = createQueryStore();
  const terms = createTermStore();
  const status = createStatusStore(source);
  const services: WorkbenchServices = {
    store,
    cart,
    query,
    queryRunner: createQueryRunner(source, query, {
      // The chosen intent, once its module has arrived; nothing until then.
      intent: () => {
        const id = settings.get().intent;
        return id ? source.loaded(id, 'intent') : undefined;
      },
    }),
    terms,
    status,
    registry,
    runs,
    toasts,
    source,
    settings,
    titles,
    crumbs,
    announcer,
    prompt,
    preview,
    focusIntentRef,
    navIntentRef,
    dispatch,
  };

  workbenchCommands({
    store,
    announce: announcer.announce,
    plugins: () => source.plugins().map((p) => p.id),
    // An explicit ask for the prompt bar outranks the focus that follows a
    // command to the panel it opened, whichever lands first.
    focusPrompt: () => {
      focusIntentRef.current = 'user';
      prompt.focus();
    },
  }).forEach((c) => registry.register(c));
  registry.register(openCommand(services));
  source.registerCommands(registry, (plugin) => pluginHostFor(services, plugin));

  // status() is asked at startup — once each background module arrives —
  // and after every command; the answer shows until the next ask.
  source.subscribe(() => status.refresh());
  registry.onRun(() => status.refresh());
  status.refresh();

  // A saved layout may pin a plugin that has since stopped being a sidebar
  // panel — the catalog did. Installed and pane-less means the block could
  // only ever render as a ghost, so the pin goes; an uninstalled plugin
  // keeps its place, because reinstalling should restore it.
  for (const plugin of store.get().sidebar.pinned) {
    if (source.manifest(plugin) && !source.has(plugin, 'pane')) {
      store.dispatch({ type: 'unpin', plugin });
    }
  }

  if (storage) {
    // Written now, not on the next change: the record of which blocks have
    // been offered is part of the layout, and if nothing else happens to save
    // it the same block is introduced again on every load — which looks like
    // the workbench re-pinning something the user just removed.
    if (initial !== saved) {
      try {
        storage.setItem(LAYOUT_STORAGE_KEY, serialize(store.get()));
      } catch {
        // Quota or privacy mode; the introduction simply repeats next time.
      }
    }
    store.subscribe(() => {
      try {
        storage.setItem(LAYOUT_STORAGE_KEY, serialize(store.get()));
      } catch {
        // Quota or privacy mode: the session still works, it just won't persist.
      }
    });
    // Written separately from the layout: a cart outlives an arrangement, and
    // a corrupt layout should not take the user's collected work with it.
    cart.subscribe(() => {
      try {
        storage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.items()));
      } catch {
        // A payload can be large. Losing persistence is better than losing the
        // session, so a full quota is not an error the user has to handle.
      }
    });
  }
  return services;
}

// `/open <plugin> [path]`: the plugin's page at a path (its root when none
// is given), or its pane when it has no pages. Works from the manifest
// alone, so it completes before any plugin code has loaded.
function openCommand(services: WorkbenchServices): Command {
  const { source, announcer } = services;
  const openable = () =>
    source.manifests().filter((m) => source.has(m.id, 'route') || source.has(m.id, 'pane'));
  return {
    name: 'open',
    title: 'Open a plugin panel',
    source: 'workbench',
    args: [
      {
        name: 'plugin',
        type: 'string',
        required: true,
        complete: (prefix) =>
          openable()
            .map((m) => m.id)
            .filter((id) => id.startsWith(prefix)),
      },
      { name: 'path', type: 'string', description: "the plugin's own path" },
    ],
    run: async ({ plugin, path }) => {
      const id = String(plugin);
      const hasRoute = source.has(id, 'route');
      const hasPane = source.has(id, 'pane');
      if (hasRoute && (path !== undefined || !hasPane)) {
        await openRoute(services, id, path === undefined ? '/' : String(path));
      } else if (hasPane) {
        openPane(services, id);
      } else {
        announcer.announce(`Nothing to open for ${id}`);
      }
    },
  };
}

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
    cart: {
      add: (item) => services.cart.add({ ...item, plugin, addedAt: Date.now() }),
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

function read(storage: Storage | null): string | null {
  try {
    return storage?.getItem(LAYOUT_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}
