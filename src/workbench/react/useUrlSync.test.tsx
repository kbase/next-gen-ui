import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import type { PanelHandle } from '@kbase/plugin-sdk';
import { defineRoute } from '@kbase/plugin-sdk';
import { noPersistence, openRoute } from '../host';
import { createWorkbench } from '../compose';
import { localPlugin } from '../host/local';
import { WORKBENCH_PATH } from './useUrlSync';
import { WorkbenchPage } from './WorkbenchPage';

// A plugin whose page hands its handle back, so a test can call `navigate`
// the way a plugin's own code does. The routes below only have to accept the
// paths the sync writes; resolving a link is the deep-link route's job and
// is tested with the real tree in routes/_workbench.
async function mountNav(entries: string[]) {
  let handle: PanelHandle | undefined;
  const services = createWorkbench({
    installed: [
      localPlugin({
        config: { id: 'nav', title: 'Nav' },
        route: () =>
          Promise.resolve(
            defineRoute({
              normalize: (path) => path,
              mount: (el, ctx) => {
                handle = ctx.panel;
                el.textContent = ctx.panel.path;
              },
            }),
          ),
      }),
    ],
    persistence: noPersistence,
    defaultAssistant: 'none',
    defaultIntent: 'none',
  });
  const root = createRootRoute({
    component: () => (
      <WorkbenchPage services={services}>
        <Outlet />
      </WorkbenchPage>
    ),
  });
  const history = createMemoryHistory({ initialEntries: entries });
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: '/p/$pluginId/$', component: () => null }),
      createRoute({ getParentRoute: () => root, path: WORKBENCH_PATH, component: () => null }),
    ]),
    history,
  });
  render(<RouterProvider router={router} />);
  await act(async () => {
    await openRoute(services, 'nav', '/a');
  });
  await waitFor(() => expect(handle).toBeDefined());
  const navigate = (path: string, options?: { replace?: boolean }) =>
    act(() => handle!.navigate(path, options));
  const setPath = (path: string) =>
    act(() => void services.dispatch({ type: 'setPath', panel: handle!.id, path }));
  return { history, navigate, setPath, at: () => history.location.pathname };
}

describe('a page navigating itself', () => {
  it('a replace to the path the panel is already on does not replace the move after it', async () => {
    const { history, navigate, setPath, at } = await mountNav([WORKBENCH_PATH, '/p/nav/a']);
    // Nothing moves: the panel is on this path already.
    navigate('/a', { replace: true });
    // What a breadcrumb click dispatches, which says nothing about history.
    setPath('/b');
    await waitFor(() => expect(at()).toBe('/p/nav/b'));
    act(() => history.back());
    await waitFor(() => expect(at()).toBe('/p/nav/a'));
  });

  it('replaces the entry when the page asks to', async () => {
    const { history, navigate, at } = await mountNav([WORKBENCH_PATH, '/p/nav/a']);
    navigate('/b', { replace: true });
    await waitFor(() => expect(at()).toBe('/p/nav/b'));
    act(() => history.back());
    await waitFor(() => expect(at()).toBe(WORKBENCH_PATH));
  });
});
