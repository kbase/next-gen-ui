import type { PluginId } from '../core';
import { makePanel } from '../core';
import type { WorkbenchServices } from '../react/services';
import { matchRoute } from './routes';

export type Resolution =
  | { ok: true }
  | { ok: false; reason: 'unknown-plugin' | 'no-document' | 'no-match'; message: string };

// A deep link `/p/<plugin>/<rest>` names one document. Resolving it opens
// that document or focuses it if it is already open; the layout the user
// had is otherwise untouched. Resolution happens after the layout has been
// restored from storage, so "already open" means open in that layout.
export function resolveDeepLink(
  services: WorkbenchServices,
  plugin: PluginId,
  rest: string,
  // Params the route has no segment for, as written by pathForPanel. The
  // round trip has to be exact: a link that resolves to different params
  // is a different panel, and the layout would gain one on every focus.
  search = '',
): Resolution {
  const manifest = services.source.manifest(plugin);
  if (!manifest) {
    return {
      ok: false,
      reason: 'unknown-plugin',
      message: `No plugin is installed as “${plugin}”.`,
    };
  }
  if (!manifest.document) {
    return {
      ok: false,
      reason: 'no-document',
      message: `${manifest.title} has no pages to link to.`,
    };
  }
  const params = matchRoute(manifest.document.route, '/' + rest.replace(/^\/+/, ''));
  if (!params) {
    return {
      ok: false,
      reason: 'no-match',
      message: `${manifest.title} has no page at /${rest}; its pages look like ${manifest.document.route}.`,
    };
  }
  const extra = Object.fromEntries(new URLSearchParams(search));
  services.dispatch({
    type: 'open',
    panel: makePanel(plugin, 'document', { ...extra, ...params }),
  });
  return { ok: true };
}
