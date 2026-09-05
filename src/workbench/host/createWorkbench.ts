import type { PluginHost } from '../../plugins/sdk';
import type { PluginId } from '../core';
import { createWorkbenchStore, defaultLayout, deserialize, makePanel, serialize } from '../core';
import type { Command } from '../commands';
import { createCommandRegistry, workbenchCommands } from '../commands';
import { createAnnouncer, createCrumbStore, createTitleStore } from '../react';
import type { WorkbenchServices } from '../react';
import { fallbackTitle } from '../react/context';
import { createPreviewHandle, createPromptHandle } from '../react/services';
import type { InstalledPlugin } from './installed';
import { createHostIndex } from './installed';
import { catalog } from './catalog';
import { home } from './home';
import { shortcutsPlugin } from './shortcuts';
import { routeParams } from './routes';
import { createSettingsStore } from './settings';

export const LAYOUT_STORAGE_KEY = 'workbench.layout.v1';

export interface CreateWorkbenchOptions {
  installed: InstalledPlugin[];
  // null for tests and for a browser with storage disabled.
  storage: Storage | null;
  defaultPinned?: PluginId[];
  // The plugin whose prompt handler answers the bar until the user picks.
  defaultAssistant?: PluginId | null;
}

// Builds the store, the command registry and their companions once, before
// React mounts. The layout is read from storage here so the first render is
// already the restored one.
export function createWorkbench({
  installed,
  storage,
  defaultPinned = [],
  defaultAssistant = null,
}: CreateWorkbenchOptions): WorkbenchServices {
  const titles = createTitleStore();
  const crumbs = createCrumbStore();
  const announcer = createAnnouncer();
  const prompt = createPromptHandle();
  const preview = createPreviewHandle();
  const focusIntentRef: WorkbenchServices['focusIntentRef'] = { current: 'command' };
  const source = createHostIndex([...installed, catalog, shortcutsPlugin, home]);
  const settings = createSettingsStore(storage, { assistant: defaultAssistant });

  const fallback = () => defaultLayout({ pinned: defaultPinned });
  const store = createWorkbenchStore({
    initial: deserialize(read(storage), fallback),
    title: (id, panel) => titles.get(id) ?? fallbackTitle(services, panel, id),
  });

  const registry = createCommandRegistry();
  const dispatch: WorkbenchServices['dispatch'] = (op) => {
    const result = store.dispatch(op);
    if (result.changed) announcer.announce(result.announcement);
    return result.changed;
  };
  const services: WorkbenchServices = {
    store,
    registry,
    source,
    settings,
    titles,
    crumbs,
    announcer,
    prompt,
    preview,
    focusIntentRef,
    dispatch,
  };

  workbenchCommands({
    store,
    announce: announcer.announce,
    plugins: () => source.plugins().map((p) => p.id),
    focusPrompt: () => prompt.focus(),
  }).forEach((c) => registry.register(c));
  registry.register(openCommand(services));
  source.registerCommands(registry, (plugin) => pluginHostFor(services, plugin));

  // A saved layout may pin a plugin that has since stopped being a sidebar
  // panel — the catalog did. Installed and navigator-less means the block
  // could only ever render as a ghost, so the pin goes; an uninstalled
  // plugin keeps its place, because reinstalling should restore it.
  for (const plugin of store.get().sidebar.pinned) {
    if (source.manifest(plugin) && !source.panel(`${plugin}/navigator`)) {
      store.dispatch({ type: 'unpin', plugin });
    }
  }

  if (storage) {
    store.subscribe(() => {
      try {
        storage.setItem(LAYOUT_STORAGE_KEY, serialize(store.get()));
      } catch {
        // Quota or privacy mode: the session still works, it just won't persist.
      }
    });
  }
  return services;
}

// `/open <plugin> [value]`: a navigator plugin's navigator, an app's single
// page, or a document whose route has one param filled by `value`. Works
// from the manifest alone, so it completes and runs before any plugin code
// has loaded.
function openCommand(services: WorkbenchServices): Command {
  const { source, dispatch, announcer } = services;
  const openable = () => source.manifests().filter((m) => m.navigator || m.document);
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
      { name: 'value', type: 'string', description: 'the document route param' },
    ],
    run: ({ plugin, value }) => {
      const manifest = source.manifest(String(plugin));
      if (!manifest || !(manifest.navigator || manifest.document)) {
        announcer.announce(`Nothing to open for ${String(plugin)}`);
        return;
      }
      const params = manifest.document ? routeParams(manifest.document.route) : [];
      if (manifest.document && (value !== undefined || !manifest.navigator)) {
        if (params.length > 1 || (params.length === 1 && value === undefined)) {
          announcer.announce(`/open ${manifest.id} needs ${params.join(', ')}`);
          return;
        }
        const filled = params.length === 1 ? { [params[0]]: String(value) } : {};
        dispatch({ type: 'open', panel: makePanel(manifest.id, 'document', filled) });
        return;
      }
      dispatch({ type: 'open', panel: makePanel(manifest.id, 'navigator') });
    },
  };
}

// What a plugin's code may do to the workbench, scoped to that plugin.
export function pluginHostFor(services: WorkbenchServices, plugin: PluginId): PluginHost {
  return {
    openDocument: (params) =>
      void services.dispatch({ type: 'open', panel: makePanel(plugin, 'document', params) }),
    runCommand: async (name, values = {}) => {
      await services.registry.run(name, values);
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
