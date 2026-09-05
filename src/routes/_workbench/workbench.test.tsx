import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from '../../routeTree.gen';
import { testWorkbench } from '../../test/workbench';

// Lazy plugin modules and route loaders both run before a panel appears;
// under a loaded test run that exceeds the 1s default.
configure({ asyncUtilTimeout: 5000 });

function mountAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(['auth', 'me'], { user: 'tester', display: 'Tester' });
  queryClient.setQueryData(['auth', 'tokenInfo'], { id: 'session-1', user: 'tester', mfa: 'Used' });
  const workbench = testWorkbench();
  const router = createRouter({
    routeTree,
    context: { queryClient, workbench },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, workbench };
}

const pathname = (router: ReturnType<typeof mountAt>['router']) => router.state.location.pathname;

describe('workbench deep links', () => {
  it('opens the linked document and keeps the URL', async () => {
    const { router } = mountAt('/p/koros/arc/nitro');
    expect(await screen.findByRole('tab', { name: /arc: nitrogenase/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(pathname(router)).toBe('/p/koros/arc/nitro');
  });

  it('focuses an already-open document instead of duplicating it', async () => {
    const { router, workbench } = mountAt('/p/koros/arc/nitro');
    await screen.findByRole('tab', { name: /arc: nitrogenase/i });
    await router.navigate({ to: '/p/$pluginId/$', params: { pluginId: 'jobs', _splat: 'job/12' } });
    await screen.findByRole('tab', { name: /job 12/i });
    await router.navigate({
      to: '/p/$pluginId/$',
      params: { pluginId: 'koros', _splat: 'arc/nitro' },
    });
    await waitFor(() => expect(workbench.store.get().focus).toBe('koros/document?slug=nitro'));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('writes the URL when a document opens or gains focus, and clears it on close', async () => {
    const user = userEvent.setup();
    const { router } = mountAt('/workbench');
    const sidebar = await screen.findByRole('region', { name: 'Sidebar' });
    await user.click(await within(sidebar).findByRole('button', { name: /assemble reads/i }));
    await waitFor(() => expect(pathname(router)).toBe('/p/jobs/job/12'));
    // Same sidebar node: the shell must not remount when the URL changes.
    expect(sidebar.isConnected).toBe(true);
    await user.click(await within(sidebar).findByRole('button', { name: /nifh search/i }));
    await waitFor(() => expect(pathname(router)).toBe('/p/jobs/job/20'));
    await user.click(screen.getByRole('tab', { name: /job 12/i }));
    await waitFor(() => expect(pathname(router)).toBe('/p/jobs/job/12'));
    await user.keyboard('{Alt>}{Shift>}W{/Shift}{/Alt}');
    await waitFor(() => expect(pathname(router)).toBe('/p/jobs/job/20'));
    await user.keyboard('{Alt>}{Shift>}W{/Shift}{/Alt}');
    await waitFor(() => expect(pathname(router)).toBe('/workbench'));
  });

  it('links to an app page with an empty route', async () => {
    const { router } = mountAt('/p/genknown');
    expect(await screen.findByRole('tab', { name: /genknown/i })).toBeInTheDocument();
    expect(pathname(router)).toBe('/p/genknown');
  });

  it('a link to nothing announces why and lands on the workbench', async () => {
    const { router } = mountAt('/p/jobs/arc/12');
    await waitFor(() => expect(pathname(router)).toBe('/workbench'));
    expect(
      await screen.findByRole('status', { name: 'Workbench announcements' }),
    ).toHaveTextContent(/jobs has no page at/i);
  });
});
