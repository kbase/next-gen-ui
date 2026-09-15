import { Outlet, createFileRoute } from '@tanstack/react-router';
import { WorkbenchPage } from '../workbench/react';

// One shell for every URL beneath it. /workbench and /p/<plugin>/… differ
// only in what their loaders do to the layout; the component tree stays
// mounted across them, so panels (and app iframes) survive a URL change.
export const Route = createFileRoute('/_workbench')({
  component: Shell,
  staticData: { chrome: 'workbench' },
});

function Shell() {
  return (
    <WorkbenchPage services={Route.useRouteContext().workbench}>
      <Outlet />
    </WorkbenchPage>
  );
}
