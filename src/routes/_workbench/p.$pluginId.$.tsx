import { createFileRoute, redirect } from '@tanstack/react-router';
import { openRoute } from '../../workbench/host';
import { WORKBENCH_PATH } from '../../workbench/react';

// A deep link into a plugin's page: /p/<pluginId><the plugin's path>. The
// path names a page, never a layout; resolving it opens the page into
// whatever arrangement the user already had, or focuses the panel already
// showing it. An entry written by the URL sync carries the panel it was
// written for, so Back returns that panel to that path instead of opening
// another. A link that names nothing announces why and lands on the bare
// workbench.
export const Route = createFileRoute('/_workbench/p/$pluginId/$')({
  loader: async ({ context, params, location }) => {
    const services = context.workbench;
    const path = `/${params._splat ?? ''}${location.searchStr}`;
    const remembered = location.state.panel;
    const panel = remembered ? services.store.get().panels[remembered] : undefined;
    if (panel && panel.plugin === params.pluginId && panel.kind === 'route') {
      // The entry already names this path; the URL sync must not write it
      // again, so the intent is set only when the path actually moves.
      if (panel.path !== path) {
        services.navIntentRef.current = 'replace';
        services.dispatch({ type: 'setPath', panel: panel.id, path });
      }
      services.dispatch({ type: 'focus', panel: panel.id });
      return;
    }
    const opened = await openRoute(services, params.pluginId, path);
    if (!opened) throw redirect({ to: WORKBENCH_PATH, replace: true });
  },
  // The shell is drawn by the _workbench layout route; this route only
  // resolves the link.
  component: () => null,
  staticData: { title: 'Workbench' },
});
