import { createToastManager } from '@kbase/design-system';
import type { PluginId } from '../core';
import {
  createCartStore,
  createQueryStore,
  createTermStore,
  createWorkbenchStore,
  defaultContext,
  defaultLayout,
  paneId,
  placementOf,
  reduce,
} from '../core';
import type { Command } from '../commands';
import { createCommandRegistry, createRunStore, workbenchCommands } from '../commands';
import { createAnnouncer } from '../host/announcer';
import { createCrumbStore } from '../host/crumbs';
import { createDestinationStore } from '../host/destination';
import { createFrameLayer } from '../host/frames';
import type { InstalledPlugin } from '../host/installed';
import { createHostIndex } from '../host/installed';
import type { DeclinedPlugin } from '../host/registry';
import { openPane, openRoute } from '../host/open';
import { pluginHostFor } from '../host/pluginHost';
import { hostPlugins } from './hostPlugins';
import type { WorkbenchPersistence } from '../host/persistence';
import { createQueryRunner } from '../host/query/runner';
import type { WorkbenchServices } from '../host/services';
import { createPreviewHandle, createPromptHandle, fallbackTitle } from '../host/services';
import { createSettingsStore } from '../host/settings';
import { createStatusStore } from '../host/status';
import { createTitleStore } from '../host/titles';

export interface CreateWorkbenchOptions {
  installed: InstalledPlugin[];
  // What the registry listed and `loadInstalled` did not load; Settings
  // shows it beside what is installed.
  declined?: DeclinedPlugin[];
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
  declined = [],
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
  const source = createHostIndex([...installed, ...hostPlugins(() => services)], declined);
  const settings = createSettingsStore(
    loaded.settings ?? { assistant: defaultAssistant, intent: defaultIntent },
  );
  // The cart is host state, not layout: it survives a layout reset, and it is
  // the thing most likely to move to the account later.
  const cart = createCartStore([...(loaded.cart ?? [])]);

  // A saved layout is restored as written; `defaultPinned` builds a fresh
  // one. A default pin the reader's layout has never been offered — a block
  // added to the workbench after their layout was saved — is pinned once
  // now, and recorded in the settings document so that unpinning it holds.
  // The record is beside the cart and the settings rather than in the layout,
  // where the next layout key bump would take it. A pane the reader moved to
  // the main area is placed already and is left there.
  const offered = new Set(settings.get().offered ?? []);
  let initial = loaded.layout ?? defaultLayout({ pinned: defaultPinned });
  const newlyOffered: PluginId[] = [];
  for (const plugin of defaultPinned) {
    if (offered.has(plugin)) continue;
    if (placementOf(initial, paneId(plugin)).zone === 'none') {
      const pinned = reduce(initial, { type: 'pin', plugin }, defaultContext);
      // A locked layout refuses the pin; the offer then waits for the unlock.
      if (pinned === initial) continue;
      initial = pinned;
    }
    newlyOffered.push(plugin);
  }
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
    frames: createFrameLayer(),
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
    pluginTitle: (plugin) => source.manifest(plugin)?.title ?? plugin,
    panelTitle: (id) => titles.get(id) ?? fallbackTitle(services, store.get().panels[id], id),
  }).forEach((c) => registry.register(c));
  registry.register(openCommand(services));
  source.registerCommands(registry, (plugin) => pluginHostFor(services, plugin));

  store.subscribe(() => save('layout', store.get()));
  // Saved as its own document: a cart outlives an arrangement, and a corrupt
  // layout should not take the user's collected work with it. Settings are
  // separate for the same reason — resetting the layout keeps them.
  cart.subscribe(() => save('cart', cart.items()));
  settings.subscribe(() => save('settings', settings.get()));
  // Written now that a change reaches storage, so a block is offered once
  // rather than pinned again on every load.
  if (newlyOffered.length) settings.set({ offered: [...offered, ...newlyOffered] });
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
