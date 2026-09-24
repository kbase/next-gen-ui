import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from '../../routeTree.gen';
import { BACKUP_COOKIE_NAME, clearBackupToken } from '../../api/auth';
import { server } from '../../test/setup';

// A session from another kbase.us site arrives through the backup cookie.
let tokenInfoServed = false;

function backupSession(mfa: 'Used' | 'Unknown') {
  tokenInfoServed = false;
  document.cookie = `${BACKUP_COOKIE_NAME}=tok; path=/`;
  server.use(
    http.get('*/services/auth/api/V2/me', () =>
      HttpResponse.json({ user: 'tester', display: 'Tester', idents: [] }),
    ),
    http.get('*/services/auth/api/V2/token', () => {
      tokenInfoServed = true;
      return HttpResponse.json({ id: 'session-1', user: 'tester', mfa });
    }),
  );
}

function mountAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
  return router;
}

afterEach(() => {
  clearBackupToken();
  document.cookie = 'kbase_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('login page and 2FA', () => {
  it('treats a session without 2FA as signed out', async () => {
    backupSession('Unknown');
    mountAt('/login?error=mfa-required');
    const button = await screen.findByRole('button', { name: /sign in with orcid/i });
    await waitFor(() => expect(tokenInfoServed).toBe(true));
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.queryByText(/signed in as/i)).toBeNull();
  });

  it('treats a session with 2FA as signed in', async () => {
    backupSession('Used');
    mountAt('/login');
    expect(await screen.findByText(/signed in as/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with orcid/i })).toBeDisabled();
  });

  it('still shows a session without 2FA in the gallery', async () => {
    backupSession('Unknown');
    mountAt('/portals');
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /link your orcid id/i })).toBeInTheDocument(),
    );
    expect(screen.getByText('tester')).toBeInTheDocument();
  });
});

describe('the root gate after /me switches tokens', () => {
  // kbase_session holds A, which used 2FA and is cached as such; A is then
  // revoked, /me falls back to the backup B, which did not use 2FA.
  it('checks 2FA for the new token, not the cached answer for the old one', async () => {
    document.cookie = 'kbase_session=A; path=/';
    document.cookie = `${BACKUP_COOKIE_NAME}=B; path=/`;
    server.use(
      http.get('*/services/auth/api/V2/me', ({ request }) =>
        request.headers.get('Authorization') === 'B'
          ? HttpResponse.json({ user: 'b', display: 'B', idents: [] })
          : new HttpResponse('{}', { status: 401 }),
      ),
      http.get('*/services/auth/api/V2/token', ({ request }) =>
        HttpResponse.json({
          id: 's',
          user: 'b',
          mfa: request.headers.get('Authorization') === 'B' ? 'Unknown' : 'Used',
        }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['auth', 'tokenInfo', 'A'], { id: 's', user: 'a', mfa: 'Used' });
    const router = createRouter({
      routeTree,
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ['/account'] }),
    });
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toMatchObject({ error: 'mfa-required' });
  });
});
