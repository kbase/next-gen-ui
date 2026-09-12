import type { MainTarget, PanelId, PluginId } from '../core';
import { makePane, makeRoute, placementOf } from '../core';
import type { WorkbenchServices } from './services';

// Opening a plugin's page. The one place the host compares paths, and it
// does so with the plugin's own `normalize`: a panel already showing the
// same page, by that judgement, is focused rather than joined by a second.
// Loading the route module first costs nothing extra — rendering the panel
// would load it anyway.

export interface OpenRouteOptions {
  duplicate?: boolean;
  target?: MainTarget;
}

let counter = 0;
const newKey = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function openRoute(
  services: WorkbenchServices,
  plugin: PluginId,
  path: string,
  options: OpenRouteOptions = {},
): Promise<PanelId | undefined> {
  const { source, store, dispatch, announcer } = services;
  const manifest = source.manifest(plugin);
  if (!manifest) {
    announcer.announce(`No plugin is installed as “${plugin}”.`);
    return undefined;
  }
  if (!source.has(plugin, 'route')) {
    announcer.announce(`${manifest.title} has no pages.`);
    return undefined;
  }
  let normalize: (p: string) => string;
  try {
    normalize = (await source.module(plugin, 'route')).normalize;
  } catch (err) {
    announcer.announce(`${manifest.title} failed to load: ${message(err)}`);
    return undefined;
  }
  if (!options.duplicate) {
    const wanted = normalize(path);
    const existing = Object.values(store.get().panels).find(
      (p) => p.plugin === plugin && p.kind === 'route' && normalize(p.path) === wanted,
    );
    if (existing) {
      dispatch({ type: 'focus', panel: existing.id, by: 'command' });
      return existing.id;
    }
  }
  const panel = makeRoute(plugin, path, newKey());
  dispatch({ type: 'open', panel, target: options.target });
  return panel.id;
}

// A plugin's sidebar block: focused where it already sits, opened as a tab
// otherwise. `open` on a placed pane only moves focus, but it pushes an undo
// step doing it, so one Ctrl+Z would go to the focus change instead of to
// whatever the user did before. Same distinction `openRoute` makes above.
export function openPane(services: WorkbenchServices, plugin: PluginId): boolean {
  if (!services.source.has(plugin, 'pane')) {
    services.announcer.announce(
      `${services.source.manifest(plugin)?.title ?? plugin} has no pane.`,
    );
    return false;
  }
  const panel = makePane(plugin);
  if (placementOf(services.store.get(), panel.id).zone !== 'none') {
    return services.dispatch({ type: 'focus', panel: panel.id, by: 'command' });
  }
  return services.dispatch({ type: 'open', panel });
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
