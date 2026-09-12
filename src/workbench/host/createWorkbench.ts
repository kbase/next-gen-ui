import { createToastManager } from '@kbase/design-system';
import type { PluginHost } from '../../plugins/sdk';
import { qualifyCommand } from '../../plugins/sdk';
import type { PluginId } from '../core';
import {
  createCartStore,
  createQueryStore,
  createTermStore,
  createWorkbenchStore,
  defaultLayout,
} from '../core';
import type { Command } from '../commands';
import { createCommandRegistry, createRunStore, workbenchCommands } from '../commands';
import { createAnnouncer, createCrumbStore, createTitleStore } from '../react';
import type { WorkbenchServices } from '../react';
import { fallbackTitle } from '../react/context';
import { createPreviewHandle, createPromptHandle } from '../react/services';
import { createDestinationStore } from './destination';
import type { InstalledPlugin } from './installed';
import { createHostIndex } from './installed';
import { openPane, openRoute } from './open';
import { hostPlugins } from './pages';
import type { WorkbenchPersistence } from './persistence';
import { createQueryRunner } from './query/runner';
import { createSettingsStore } from './settings';
import { createStatusStore } from './status';

export interface CreateWorkbenchOptions {
  installed: InstalledPlugin[];
  // What a previous session left, already loaded, and where changes go.
  // `noPersistence` is a workbench that starts fresh and forgets.
  persistence: WorkbenchPersistence;
  defaultPinned?: PluginId[];
  // The plugin whose prompt module answers the bar until the user picks.
  defaultAssistant: PluginId;
  // The plugin whose intent module suggests commands until the user picks.
  // Both are required because Settings offers no "none": a workbench is
  // built with each one chosen, and naming a plugin that turns out not to be
  // installed is the only way to have neither.
  defaultIntent: PluginId;
}

// Builds the store, the command registry and their companions once, before
// React mounts, on top of documents the caller has already loaded, so the
// first render is already the restored one.
export function createWorkbench({
  installed,
  persistence: { loaded, save },
  defaultPinned = [],
  defaultAssistant,
  defaultIntent,
}: CreateWorkbenchOptions): WorkbenchServices {
  const titles = createTitleStore();
  const crumbs = createCrumbStore();
  const announcer = createAnnouncer();
  const prompt = createPromptHandle();
  const preview = createPreviewHandle();
  const source = createHostIndex([...installed, ...hostPlugins(() => services)]);
  const settings = createSettingsStore(
    loaded.settings ?? { assistant: defaultAssistant, intent: defaultIntent },
  );
  // The cart is host state, not layout: it survives a layout reset, and it is
  // the thing most likely to move to the account later.
  const cart = createCartStore([...(loaded.cart ?? [])]);

  // A saved layout is restored verbatim; `defaultPinned` only builds a fresh
  // one, which is what a reader with no readable layout gets.
  const initial = loaded.layout ?? defaultLayout({ pinned: defaultPinned });
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
  const destination = createDestinationStore(source, settings);
  const services: WorkbenchServices = {
    store,
    cart,
    query,
    queryRunner: createQueryRunner(source, query, {
      // The chosen intent, once its module has arrived; nothing until then,
      // and nothing ever if the plugin it names is not installed.
      intent: () => source.loaded(settings.get().intent, 'intent'),
    }),
    terms,
    status,
    destination,
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
    dispatch,
  };

  workbenchCommands({
    store,
    dispatch,
    announce: announcer.announce,
    plugins: () => source.plugins().map((p) => p.id),
    panes: () =>
      source
        .plugins()
        .map((p) => p.id)
        .filter((id) => source.has(id, 'pane')),
    focusPane: (plugin) => void openPane(services, plugin),
    previewPane: (plugin) => preview.set(plugin),
    focusPrompt: () => prompt.focus(),
  }).forEach((c) => registry.register(c));
  registry.register(openCommand(services));
  source.registerCommands(registry, (plugin) => pluginHostFor(services, plugin));

  store.subscribe(() => save('layout', store.get()));
  // Saved as its own document: a cart outlives an arrangement, and a corrupt
  // layout should not take the user's collected work with it. Settings are
  // separate for the same reason — resetting the layout keeps them.
  cart.subscribe(() => save('cart', cart.items()));
  settings.subscribe(() => save('settings', settings.get()));
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
        required: true,
        complete: (prefix) =>
          openable()
            .map((m) => m.id)
            .filter((id) => id.startsWith(prefix)),
      },
      { name: 'path', description: "the plugin's own path" },
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
