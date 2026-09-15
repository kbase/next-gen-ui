import { PathSchema } from '@kbase/plugin-sdk';
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
    // `normalize` is the plugin's own judgement of what one page is, and the
    // only thing the host compares paths by. A plugin that answers with
    // something other than a string would make every page distinct from
    // every other, so an unusable answer is dropped and the path stands for
    // itself: a second tab is a worse outcome than no tab at all.
    const same = (p: string) => {
      const said: unknown = normalize(p);
      const parsed = PathSchema.safeParse(said);
      if (parsed.success) return parsed.data;
      console.warn(`plugin ${plugin}: its route's normalize() did not answer with a path; ignoring it`);
      return p;
    };
    const wanted = same(path);
    const existing = Object.values(store.get().panels).find(
      (p) => p.plugin === plugin && p.kind === 'route' && same(p.path) === wanted,
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
