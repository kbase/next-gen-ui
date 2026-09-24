import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

import {
  MfaRequiredError,
  authMeOptions,
  clearAuthCache,
  installCrossTabAuthSync,
  primeAuthCache,
} from './queries';
import {
  AUTH_SIGNAL_KEY,
  BACKUP_COOKIE_NAME,
  clearBackupToken,
  clearToken,
  getToken,
  setToken,
} from './cookie';

const fetchMock = vi.fn<typeof fetch>();

function meRes(body: object = { user: 't', display: 'T' }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function tokenInfoRes(mfa: 'Used' | 'NotUsed' | 'Unknown' | undefined = 'Used') {
  return new Response(JSON.stringify({ id: 'session-1', user: 't', mfa }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  clearToken();
  clearBackupToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
  clearBackupToken();
});

const backupPresent = () => document.cookie.includes(`${BACKUP_COOKIE_NAME}=`);

describe('primeAuthCache', () => {
  it('writes cookie and primes cache on success', async () => {
    fetchMock.mockResolvedValueOnce(meRes()).mockResolvedValueOnce(tokenInfoRes('Used'));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const me = await primeAuthCache(qc, {
      token: 'tok-abc',
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(me).toMatchObject({ user: 't', display: 'T' });
    expect(getToken()).toBe('tok-abc');
    expect(qc.getQueryData(['auth', 'me'])).toMatchObject({ user: 't' });
    expect(qc.getQueryData(['auth', 'tokenInfo', 'tok-abc'])).toMatchObject({ mfa: 'Used' });
  });

  it('rejects without writing the cookie when the session lacks MFA', async () => {
    fetchMock.mockResolvedValueOnce(meRes()).mockResolvedValueOnce(tokenInfoRes('NotUsed'));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await expect(
      primeAuthCache(qc, {
        token: 'tok-abc',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toBeInstanceOf(MfaRequiredError);

    expect(getToken()).toBeNull();
    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(qc.getQueryData(['auth', 'tokenInfo', 'tok-abc'])).toBeUndefined();
  });

  it('does not write the cookie when /api/V2/me rejects the token (401)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await expect(
      primeAuthCache(qc, {
        token: 'bad-tok',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow();

    expect(getToken()).toBeNull();
    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
  });

  it('does not write the cookie when /api/V2/me errors (5xx)', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await expect(
      primeAuthCache(qc, {
        token: 'oops',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow();

    expect(getToken()).toBeNull();
  });

  it('does not overwrite a pre-existing cookie when validation rejects the candidate', async () => {
    // primeAuthCache must not write its (bad) candidate token to the
    // cookie. A pre-existing cookie is browser-level shared state
    // across tabs / subdomains and is not ours to clear here; doing
    // so would log out other tabs unexpectedly.
    document.cookie = `kbase_session=stale-prev; path=/`;
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await expect(
      primeAuthCache(qc, {
        token: 'bad-tok',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow();

    expect(getToken()).toBe('stale-prev');
  });

  it('forwards the AbortSignal to validateToken', async () => {
    fetchMock.mockResolvedValueOnce(meRes()).mockResolvedValueOnce(tokenInfoRes('Used'));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ac = new AbortController();

    await primeAuthCache(qc, {
      token: 'tok-x',
      expiresAt: new Date(Date.now() + 60_000),
      signal: ac.signal,
    });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.signal).toBe(ac.signal);
  });
});

describe('clearAuthCache', () => {
  it('drops the cookie and removes every auth-namespaced query', () => {
    document.cookie = `kbase_session=tok-zzz; path=/`;
    const qc = new QueryClient();
    qc.setQueryData(['auth', 'me'], { user: 't', display: 'T' });
    qc.setQueryData(['auth', 'sessions'], [{ id: 1 }]);
    qc.setQueryData(['other'], 'untouched');

    clearAuthCache(qc);

    expect(getToken()).toBeNull();
    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(qc.getQueryData(['auth', 'sessions'])).toBeUndefined();
    expect(qc.getQueryData(['other'])).toBe('untouched');
  });
});

describe('installCrossTabAuthSync', () => {
  it('on `cleared:<ts>` sets me to null and removes sessions without refetching', () => {
    const qc = new QueryClient();
    qc.setQueryData(['auth', 'me'], { user: 'u', display: 'U' });
    qc.setQueryData(['auth', 'sessions'], [{ id: 'a' }]);
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const unsubscribe = installCrossTabAuthSync(qc);

    window.dispatchEvent(
      new StorageEvent('storage', { key: AUTH_SIGNAL_KEY, newValue: 'cleared:12345' }),
    );

    expect(qc.getQueryData(['auth', 'me'])).toBeNull();
    expect(qc.getQueryData(['auth', 'sessions'])).toBeUndefined();
    expect(invalidate).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('on `set:<ts>` invalidates ["auth"] so the gate refetches', () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const unsubscribe = installCrossTabAuthSync(qc);

    window.dispatchEvent(
      new StorageEvent('storage', { key: AUTH_SIGNAL_KEY, newValue: 'set:67890' }),
    );

    expect(spy).toHaveBeenCalledWith({ queryKey: ['auth'] });
    unsubscribe();
  });

  it('falls back to invalidate on unknown signal values', () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const unsubscribe = installCrossTabAuthSync(qc);

    window.dispatchEvent(new StorageEvent('storage', { key: AUTH_SIGNAL_KEY, newValue: '12345' }));

    expect(spy).toHaveBeenCalledWith({ queryKey: ['auth'] });
    unsubscribe();
  });

  it('ignores storage events for other keys', () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const unsubscribe = installCrossTabAuthSync(qc);

    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated', newValue: 'foo' }));

    expect(spy).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('returns an unsubscribe function that detaches the listener', () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const unsubscribe = installCrossTabAuthSync(qc);
    unsubscribe();

    window.dispatchEvent(new StorageEvent('storage', { key: AUTH_SIGNAL_KEY, newValue: 'set:99' }));

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('authMeOptions', () => {
  const later = () => new Date(Date.now() + 60_000);

  it('clears both cookies when /me rejects the token (401)', async () => {
    setToken('dead', later());
    document.cookie = `${BACKUP_COOKIE_NAME}=dead; path=/`;
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    const me = await new QueryClient().fetchQuery(authMeOptions());
    expect(me).toBeNull();
    expect(getToken()).toBeNull();
    expect(backupPresent()).toBe(false);
  });

  it('keeps both cookies when /me errors (5xx)', async () => {
    setToken('live', later());
    document.cookie = `${BACKUP_COOKIE_NAME}=live; path=/`;
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    await expect(new QueryClient().fetchQuery(authMeOptions())).rejects.toThrow();
    expect(getToken()).toBe('live');
    expect(backupPresent()).toBe(true);
  });

  it('validates the backup token when kbase_session is absent', async () => {
    document.cookie = `${BACKUP_COOKIE_NAME}=from-backup; path=/`;
    fetchMock.mockResolvedValueOnce(meRes({ user: 'b', display: 'B' }));
    const me = await new QueryClient().fetchQuery(authMeOptions());
    expect(me?.user).toBe('b');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      'from-backup',
    );
  });
});

describe('authMeOptions with two different tokens', () => {
  const later = () => new Date(Date.now() + 60_000);
  const backupValue = () =>
    document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${BACKUP_COOKIE_NAME}=`))
      ?.split('=')[1];

  it('keeps a live backup when kbase_session is dead, and signs in with it', async () => {
    setToken('dead', later());
    document.cookie = `${BACKUP_COOKIE_NAME}=live; path=/`;
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(meRes({ user: 'b', display: 'B' }));
    const me = await new QueryClient().fetchQuery(authMeOptions());
    expect(me?.user).toBe('b');
    expect(backupValue()).toBe('live');
  });

  it('deletes the backup when both tokens are dead', async () => {
    setToken('dead-a', later());
    document.cookie = `${BACKUP_COOKIE_NAME}=dead-b; path=/`;
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 401 }));
    expect(await new QueryClient().fetchQuery(authMeOptions())).toBeNull();
    expect(backupPresent()).toBe(false);
  });
});

describe('authMeOptions and other tabs', () => {
  const later = () => new Date(Date.now() + 60_000);
  const signal = () => localStorage.getItem(AUTH_SIGNAL_KEY) ?? '';

  it('tells other tabs only that the session changed when the backup takes over', async () => {
    setToken('dead', later());
    document.cookie = `${BACKUP_COOKIE_NAME}=live; path=/`;
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(meRes({ user: 'b', display: 'B' }));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await new QueryClient().fetchQuery(authMeOptions());
    const signals = setItem.mock.calls.filter(([k]) => k === AUTH_SIGNAL_KEY).map(([, v]) => v);
    setItem.mockRestore();
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatch(/^set:/);
  });

  it('asks other tabs to re-check when the backup check fails', async () => {
    setToken('dead', later());
    document.cookie = `${BACKUP_COOKIE_NAME}=maybe; path=/`;
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockRejectedValueOnce(new TypeError('network'));
    localStorage.removeItem(AUTH_SIGNAL_KEY);
    await expect(new QueryClient().fetchQuery(authMeOptions())).rejects.toThrow('network');
    expect(signal()).toMatch(/^set:/);
    expect(backupPresent()).toBe(true);
  });

  it('tells other tabs the session ended when no token is left', async () => {
    setToken('dead', later());
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await new QueryClient().fetchQuery(authMeOptions());
    expect(signal()).toMatch(/^cleared:/);
  });
});

describe('clearAuthCache and the backup cookie', () => {
  // The gate calls this when this app rejects a live token (no MFA); the
  // backup is shared with other kbase.us sites that still accept it.
  it('leaves kbase_session_backup in place', () => {
    document.cookie = `${BACKUP_COOKIE_NAME}=live; path=/`;
    clearAuthCache(new QueryClient());
    expect(backupPresent()).toBe(true);
  });
});
