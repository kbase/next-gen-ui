import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { server } from '../../test/setup';
import { AUTH_ORIGIN } from './client';
import { BACKUP_COOKIE_NAME, clearBackupToken, setToken, clearToken, getToken } from './cookie';
import { useMaybeMe, useSignOut, useUpdateMe } from './hooks';

const navigateSpy = vi.fn(() => Promise.resolve());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  navigateSpy.mockClear();
  clearToken();
});
afterEach(() => {
  clearToken();
  clearBackupToken();
});

describe('useMaybeMe', () => {
  it('returns null when there is no cached user', () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useMaybeMe(), { wrapper: makeWrapper(qc) });
    expect(result.current).toBeNull();
  });

  it('returns the cached Me when one is seeded', () => {
    const qc = new QueryClient();
    qc.setQueryData(['auth', 'me'], { user: 't', display: 'T' });
    const { result } = renderHook(() => useMaybeMe(), { wrapper: makeWrapper(qc) });
    expect(result.current).toMatchObject({ user: 't', display: 'T' });
  });
});

describe('useUpdateMe', () => {
  it('optimistically merges updated fields into the cached Me on success', async () => {
    server.use(
      http.put(`${AUTH_ORIGIN}/services/auth/me`, () => new HttpResponse(null, { status: 204 })),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['auth', 'me'], { user: 't', display: 'Old', email: 'old@x.co' });
    setToken('tok-1', new Date(Date.now() + 60_000));

    const { result } = renderHook(() => useUpdateMe(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      await result.current.mutateAsync({ display: 'New', email: 'new@x.co' });
    });

    const cached = qc.getQueryData(['auth', 'me']) as { display: string; email: string };
    expect(cached.display).toBe('New');
    expect(cached.email).toBe('new@x.co');
  });

  it('rejects when there is no token', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useUpdateMe(), { wrapper: makeWrapper(qc) });
    await expect(
      act(async () => {
        await result.current.mutateAsync({ display: 'x', email: 'a@b.co' });
      }),
    ).rejects.toThrow(/not authenticated/i);
  });
});

describe('useSignOut', () => {
  it('navigates to /login (replace), clears the cache, and revokes the token', async () => {
    setToken('tok-1', new Date(Date.now() + 60_000));
    let revokedId: string | null = null;
    server.use(
      http.get(`${AUTH_ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ id: 'session-1', user: 'u' }),
      ),
      http.delete(`${AUTH_ORIGIN}/services/auth/tokens/revoke/:id`, ({ params }) => {
        revokedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const qc = new QueryClient();
    qc.setQueryData(['auth', 'me'], { user: 'u', display: 'U' });

    const { result } = renderHook(() => useSignOut(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(navigateSpy).toHaveBeenCalledWith({ to: '/login', replace: true });
    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(getToken()).toBeNull();
    expect(revokedId).toBe('session-1');
  });

  it('clears the cookie even when revoke writes one back (resurrection guard)', async () => {
    setToken('tok-1', new Date(Date.now() + 60_000));
    server.use(
      http.get(`${AUTH_ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ id: 'session-1', user: 'u' }),
      ),
      http.delete(`${AUTH_ORIGIN}/services/auth/tokens/revoke/:id`, () => {
        // Stand in for the auth service Set-Cookie'ing a fresh
        // session value during the revoke response. Our clearToken
        // must run AFTER this and overwrite it.
        setToken('resurrected', new Date(Date.now() + 60_000));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const qc = new QueryClient();
    qc.setQueryData(['auth', 'me'], { user: 'u', display: 'U' });

    const { result } = renderHook(() => useSignOut(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(getToken()).toBeNull();
    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
  });

  it('treats a revoke failure as best-effort: cache + cookie are still cleared', async () => {
    setToken('tok-1', new Date(Date.now() + 60_000));
    server.use(
      http.get(`${AUTH_ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ error: { apperror: 'whatever' } }, { status: 500 }),
      ),
    );
    const qc = new QueryClient();
    qc.setQueryData(['auth', 'me'], { user: 'u', display: 'U' });

    const { result } = renderHook(() => useSignOut(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync();
    });

    // The mutation resolves successfully even when the revoke errors
    // out. That's intentional: revocation is best-effort.
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getToken()).toBeNull();
    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
  });

  it('clears kbase_session_backup after revoking the token', async () => {
    document.cookie = `${BACKUP_COOKIE_NAME}=tok-1; path=/`;
    server.use(
      http.get(`${AUTH_ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ id: 'session-1', user: 'u' }),
      ),
      http.delete(
        `${AUTH_ORIGIN}/services/auth/tokens/revoke/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const qc = new QueryClient();
    const { result } = renderHook(() => useSignOut(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(document.cookie).not.toContain(`${BACKUP_COOKIE_NAME}=`);
  });

  it('keeps a backup that holds a different token', async () => {
    setToken('tok-1', new Date(Date.now() + 60_000));
    document.cookie = `${BACKUP_COOKIE_NAME}=other; path=/`;
    server.use(
      http.get(`${AUTH_ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ id: 'session-1', user: 'u' }),
      ),
      http.delete(
        `${AUTH_ORIGIN}/services/auth/tokens/revoke/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const { result } = renderHook(() => useSignOut(), { wrapper: makeWrapper(new QueryClient()) });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(document.cookie).toContain(`${BACKUP_COOKIE_NAME}=other`);
  });

  it('keeps the backup when the revoke fails', async () => {
    document.cookie = `${BACKUP_COOKIE_NAME}=tok-1; path=/`;
    server.use(
      http.get(`${AUTH_ORIGIN}/services/auth/api/V2/token`, () =>
        HttpResponse.json({ error: { apperror: 'x' } }, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useSignOut(), { wrapper: makeWrapper(new QueryClient()) });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(document.cookie).toContain(`${BACKUP_COOKIE_NAME}=tok-1`);
  });
});
