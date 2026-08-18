// A plugin runs its own basepath-scoped router over the app's shared history.
// That's safe only because TanStack #6064 (a nested router reacting to
// out-of-basepath history events) needs a *persistent* container, and a plugin
// router unmounts on cross-navigation. These tests fail if an upgrade changes that.
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router';

// Records every time the plugin router renders a not-found — i.e. every time
// it processes a path with no match in its (basepath-scoped) tree. If #6064
// bites, an out-of-basepath URL like /account lands here.
const notFound = { count: 0 };

function makePluginRouter(history: RouterHistory, basepath: string) {
  const root = createRootRoute({
    component: () => <Outlet />,
    notFoundComponent: () => {
      notFound.count += 1;
      return <div>plugin:notfound</div>;
    },
  });
  const index = createRoute({ getParentRoute: () => root, path: '/', component: PluginIndex });
  const detail = createRoute({
    getParentRoute: () => root,
    path: '/detail',
    component: () => <div>plugin:detail</div>,
  });
  const router = createRouter({ routeTree: root.addChildren([index, detail]), history, basepath });
  // A real plugin is a separate build with no app `Register` augmentation, so
  // it just writes `router.navigate({ to: '/detail' })`. In this monorepo test
  // every router's `to` is typed against the app's routes, so cast to simulate.
  const navigate = router.navigate as unknown as (o: { to: string }) => Promise<void>;
  function PluginIndex() {
    return (
      <div>
        plugin:index <button onClick={() => void navigate({ to: '/detail' })}>to-detail</button>
      </div>
    );
  }
  return router;
}

function PluginMount({ history }: { history: RouterHistory }) {
  const [router] = useState(() => makePluginRouter(history, '/plug'));
  return <RouterProvider router={router} />;
}

function buildHost() {
  const history = createMemoryHistory({ initialEntries: ['/plug'] });
  const root = createRootRoute({
    component: () => (
      <div>
        <nav>
          <Link to="/account">host-account</Link>
        </nav>
        <Outlet />
      </div>
    ),
  });
  const account = createRoute({
    getParentRoute: () => root,
    path: '/account',
    component: () => <div>host:account</div>,
  });
  const plugin = createRoute({
    getParentRoute: () => root,
    path: '/plug/$',
    component: () => <PluginMount history={history} />,
  });
  return createRouter({ routeTree: root.addChildren([account, plugin]), history });
}

describe('#6064 guard: nested plugin router with basepath', () => {
  const errors: string[] = [];
  const spy = vi.spyOn(console, 'error').mockImplementation((...a) => {
    errors.push(a.map(String).join(' '));
  });
  afterEach(() => spy.mockClear());

  it('clean string nav inside the plugin (basepath prepends /plug)', async () => {
    const router = buildHost();
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('plugin:index')).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'to-detail' }));
    await waitFor(() => expect(screen.getByText('plugin:detail')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/plug/detail');
  });

  it('cross-navigation to a host route unmounts the plugin cleanly (no #6064 404/throw)', async () => {
    const router = buildHost();
    render(<RouterProvider router={router} />);
    await screen.findByText('plugin:index');

    notFound.count = 0;
    await userEvent.click(await screen.findByRole('link', { name: 'host-account' }));
    await waitFor(() => expect(screen.getByText('host:account')).toBeInTheDocument());
    expect(screen.queryByText('plugin:index')).not.toBeInTheDocument();
    expect(notFound.count).toBe(0);
    expect(errors.filter((e) => /not.?found|invariant|error/i.test(e))).toEqual([]);
  });

  it('browser back/forward traverse plugin-internal history', async () => {
    const router = buildHost();
    render(<RouterProvider router={router} />);
    await userEvent.click(await screen.findByRole('button', { name: 'to-detail' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/plug/detail'));

    await act(async () => router.history.back());
    await waitFor(() => expect(screen.getByText('plugin:index')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/plug');

    await act(async () => router.history.forward());
    await waitFor(() => expect(screen.getByText('plugin:detail')).toBeInTheDocument());
  });
});
