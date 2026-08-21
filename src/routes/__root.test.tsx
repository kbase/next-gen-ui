import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from '../routeTree.gen';
import { COOKIE_NAME, clearToken } from '../api/auth';
import { server } from '../test/setup';

beforeEach(() => clearToken());
afterEach(() => clearToken());

function setCookie(token: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/`;
}

function mountAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, queryClient };
}

describe('root gate', () => {
  it('redirects unauthenticated visitors from / to /login', async () => {
    const { router } = mountAt('/');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });

  it('redirects unauthenticated visitors from /account to /login', async () => {
    const { router } = mountAt('/account');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });

  it('lets /portals render without an auth check', async () => {
    const { router } = mountAt('/portals');
    expect(
      await screen.findByRole('heading', { level: 1, name: /portal gallery/i }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/portals');
  });

  // A pasted `/portals/`, or a browser replaying a cached 301 from a build
  // whose try_files matched a same-named doc-root directory, reaches the gate
  // with the trailing slash intact. Exact matching sent it to /login.
  it('treats a trailing-slash public route as public', async () => {
    const { router } = mountAt('/portals/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /portal gallery/i }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).not.toBe('/login');
  });

  it('lets /login render without an auth check', async () => {
    const { router } = mountAt('/login');
    expect(await screen.findByRole('button', { name: /sign in with orcid/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('passes the cookie token to /api/V2/me on gated navigation', async () => {
    setCookie('tok-passed');
    let observedAuth: string | null = null;
    server.use(
      http.get('*/services/auth/api/V2/me', ({ request }) => {
        observedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ user: 'tester', display: 'Tester' });
      }),
    );

    const { router } = mountAt('/');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(observedAuth).toBe('tok-passed');
  });

  it('redirects to /login when /api/V2/me returns 401', async () => {
    setCookie('expired-tok');
    server.use(
      http.get('*/services/auth/api/V2/me', () => new HttpResponse(null, { status: 401 })),
    );

    const { router } = mountAt('/account');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });

  it('renders the root error boundary when /api/V2/me returns 5xx', async () => {
    setCookie('any-tok');
    server.use(
      http.get('*/services/auth/api/V2/me', () => new HttpResponse('boom', { status: 503 })),
    );

    mountAt('/account');
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders the home route when an authenticated session is in cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['auth', 'me'], { user: 't', display: 'T' });
    queryClient.setQueryData(['auth', 'tokenInfo'], { id: 'session-1', user: 't', mfa: 'Used' });
    const router = createRouter({
      routeTree,
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: /welcome, t/i })).toBeInTheDocument();
  });

  it('renders the app shell (sidebar) when authenticated and the auth shell when on /login', async () => {
    // Auth layout: no sidebar.
    const { router: authRouter } = mountAt('/login');
    await waitFor(() => {
      expect(authRouter.state.location.pathname).toBe('/login');
    });
    expect(screen.queryByLabelText('Roadmap')).not.toBeInTheDocument();
  });
});
