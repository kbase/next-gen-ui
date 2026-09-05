import { createFileRoute, redirect } from '@tanstack/react-router';
import { resolveDeepLink } from '../../workbench/host';
import { WORKBENCH_PATH } from '../../workbench/react';

// A deep link into a plugin's document: /p/<pluginId>/<the plugin's route>.
// The path names a resource, never a layout; resolving it opens the document
// into whatever arrangement the user already had, or focuses it if open.
// A link that names nothing announces why and lands on the bare workbench.
export const Route = createFileRoute('/_workbench/p/$pluginId/$')({
  loader: ({ context, params, location }) => {
    const result = resolveDeepLink(
      context.workbench,
      params.pluginId,
      params._splat ?? '',
      location.searchStr,
    );
    if (!result.ok) {
      context.workbench.announcer.announce(result.message);
      throw redirect({ to: WORKBENCH_PATH, replace: true });
    }
  },
  // The shell is drawn by the _workbench layout route; this route only
  // resolves the link.
  component: () => null,
  staticData: { title: 'Workbench' },
});
