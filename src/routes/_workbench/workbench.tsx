import { createFileRoute } from '@tanstack/react-router';

// The bare workbench: the restored layout, no document addressed. The
// shell itself is drawn by the _workbench layout route.
export const Route = createFileRoute('/_workbench/workbench')({
  component: () => null,
  staticData: { title: 'Workbench' },
});
