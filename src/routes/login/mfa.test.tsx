import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from '../../routeTree.gen';
import { BACKUP_COOKIE_NAME, clearBackupToken } from '../../api/auth';
import { server } from '../../test/setup';

// A session from another kbase.us site arrives through the backup cookie.
function backupSession(mfa: 'Used' | 'Unknown') {
  document.cookie = `${BACKUP_COOKIE_NAME}=tok; path=/`;
  server.use(
    http.get('*/services/auth/api/V2/me', () =>
      HttpResponse.json({ user: 'tester', display: 'Tester', idents: [] }),
    ),
    http.get('*/services/auth/api/V2/token', () =>
      HttpResponse.json({ id: 'session-1', user: 'tester', mfa }),
    ),
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

afterEach(() => clearBackupToken());

describe('login page and 2FA', () => {
  it('treats a session without 2FA as signed out', async () => {
    backupSession('Unknown');
    mountAt('/login?error=mfa-required');
    const button = await screen.findByRole('button', { name: /sign in with orcid/i });
    // Give /me and /token time to resolve before asserting the settled state.
    await screen.findByText(/two-factor authentication required/i);
    await new Promise((r) => setTimeout(r, 50));
    expect(button).toBeEnabled();
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
