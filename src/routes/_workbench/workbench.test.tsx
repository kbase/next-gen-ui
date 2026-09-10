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
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({
    routeTree,
    context: { queryClient, workbench },
    history,
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, history, workbench };
}

const pathname = (router: ReturnType<typeof mountAt>['router']) => router.state.location.pathname;
const routePanels = (workbench: ReturnType<typeof mountAt>['workbench']) =>
  Object.values(workbench.store.get().panels).filter((p) => p.kind === 'route');

describe('workbench deep links', () => {
  it('opens the linked page and keeps the URL', async () => {
    const { router } = mountAt('/p/koros/nitro');
    expect(await screen.findByRole('tab', { name: /arc: nitrogenase/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(pathname(router)).toBe('/p/koros/nitro');
  });

  it('focuses a panel already showing the page, as the plugin normalizes it', async () => {
    const { router, workbench } = mountAt('/p/koros/nitro');
    await screen.findByRole('tab', { name: /arc: nitrogenase/i });
    await router.navigate({ href: '/p/jobs/12' });
    await screen.findByRole('tab', { name: /job 12/i });
    // A different spelling of the same arc: koros lowercases.
    await router.navigate({ href: '/p/koros/NITRO' });
    await waitFor(() =>
      expect(workbench.store.get().panels[workbench.store.get().focus!]).toMatchObject({
        plugin: 'koros',
        path: '/nitro',
      }),
    );
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('writes the URL when a page opens or gains focus, and clears it on close', async () => {
    const user = userEvent.setup();
    const { router } = mountAt('/workbench');
    const sidebar = await screen.findByRole('region', { name: 'Sidebar' });
    await user.click(await within(sidebar).findByRole('button', { name: /assemble reads/i }));
    await waitFor(() => expect(pathname(router)).toBe('/p/jobs/12'));
    // Same sidebar node: the shell must not remount when the URL changes.
    expect(sidebar.isConnected).toBe(true);
    await user.click(await within(sidebar).findByRole('button', { name: /nifh search/i }));
    await waitFor(() => expect(pathname(router)).toBe('/p/jobs/20'));
    await user.click(screen.getByRole('tab', { name: /job 12/i }));
    await waitFor(() => expect(pathname(router)).toBe('/p/jobs/12'));
    await user.keyboard('{Alt>}{Shift>}W{/Shift}{/Alt}');
    await waitFor(() => expect(pathname(router)).toBe('/p/jobs/20'));
    await user.keyboard('{Alt>}{Shift>}W{/Shift}{/Alt}');
    await waitFor(() => expect(pathname(router)).toBe('/workbench'));
  });

  it('Back returns the same panel to its earlier path instead of opening another', async () => {
    const { router, history, workbench } = mountAt('/p/koros/nitro');
    await screen.findByRole('tab', { name: /arc: nitrogenase/i });
    const [panel] = routePanels(workbench);
    workbench.dispatch({ type: 'setPath', panel: panel.id, path: '/soil' });
    await waitFor(() => expect(pathname(router)).toBe('/p/koros/soil'));
    history.back();
    await waitFor(() => expect(pathname(router)).toBe('/p/koros/nitro'));
    await waitFor(() => expect(workbench.store.get().panels[panel.id].path).toBe('/nitro'));
    expect(routePanels(workbench)).toHaveLength(1);
  });

  it('links to a page at the plugin root', async () => {
    const { router } = mountAt('/p/catalog');
    expect(await screen.findByRole('tab', { name: /settings/i })).toBeInTheDocument();
    expect(pathname(router)).toBe('/p/catalog');
  });

  it('a link to a plugin without pages announces why and lands on the workbench', async () => {
    const { router } = mountAt('/p/shortcuts/anything');
    await waitFor(() => expect(pathname(router)).toBe('/workbench'));
    expect(
      await screen.findByRole('status', { name: 'Workbench announcements' }),
    ).toHaveTextContent(/has no pages/i);
  });
});
