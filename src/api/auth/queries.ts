import { queryOptions, type QueryClient } from '@tanstack/react-query';
import {
  AUTH_ENABLED,
  getAllSessions,
  getTokenInfo,
  setAuthFailureHandler,
  validateToken,
} from './client';
import {
  AUTH_SIGNAL_KEY,
  clearBackupTokenIf,
  clearToken,
  getExpiry,
  notifyOtherTabs,
  getToken,
  setToken,
} from './cookie';
import type { AllSessions, Me, TokenInfo } from './schemas';

const AUTH_ROOT_KEY = ['auth'] as const;
const ME_KEY = ['auth', 'me'] as const;
const SESSIONS_KEY = ['auth', 'sessions'] as const;
const TOKEN_INFO_KEY = ['auth', 'tokenInfo'] as const;

// Sign-in flows through ORCID, so 2FA happens at the IdP; the token's
// `mfa` field reports whether ORCID's flow used it.
export class MfaRequiredError extends Error {
  constructor() {
    super('Two-factor authentication is required.');
    this.name = 'MfaRequiredError';
  }
}

export function authMeOptions() {
  return queryOptions({
    queryKey: ME_KEY,
    queryFn: async ({ signal }) => {
      const token = getToken();
      const me = await validateToken(token, { signal });
      // null with a token and an auth service means /me answered 401. The
      // backup is shared with other kbase.us sites.
      if (me === null && token && AUTH_ENABLED) {
        // Other tabs hear the outcome below, not this intermediate clear.
        clearToken({ notify: false });
        clearBackupTokenIf(token);
        const backup = getToken();
        if (backup && backup !== token) {
          let fromBackup: Awaited<ReturnType<typeof validateToken>>;
          try {
            fromBackup = await validateToken(backup, { signal });
          } catch (err) {
            // kbase_session is already gone; other tabs re-check rather than
            // keep a session this tab could not confirm.
            notifyOtherTabs('set');
            throw err;
          }
          if (fromBackup === null) clearBackupTokenIf(backup);
          notifyOtherTabs(fromBackup ? 'set' : 'cleared');
          return fromBackup;
        }
        notifyOtherTabs('cleared');
      }
      return me;
    },
    // Trust until invalidated. The 401 interceptor, cross-tab
    // signal, and expiry watchdog evict this; never the clock.
    staleTime: Infinity,
    retry: false,
  });
}

export function authSessionsOptions() {
  return queryOptions<AllSessions>({
    queryKey: SESSIONS_KEY,
    queryFn: ({ signal }) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return getAllSessions(token, { signal });
    },
    retry: false,
  });
}

// Keyed by the token it describes: /me can switch from kbase_session to the
// backup, and a cached answer for the old token must not vouch for the new.
export function tokenInfoOptions(token: string | null = getToken()) {
  return queryOptions<TokenInfo>({
    queryKey: [...TOKEN_INFO_KEY, token],
    queryFn: ({ signal }) => {
      if (!token) throw new Error('Not authenticated');
      return getTokenInfo(token, { signal });
    },
    staleTime: Infinity,
    retry: false,
  });
}

// Validate against /api/V2/me and /api/V2/token BEFORE writing the
// cookie or seeding the cache: a rejected token leaves no trace.
export async function primeAuthCache(
  qc: QueryClient,
  args: { token: string; expiresAt: Date; signal?: AbortSignal },
): Promise<Me> {
  const me = await validateToken(args.token, { signal: args.signal });
  if (!me) throw new Error('Token was not accepted by /api/V2/me');
  const tokenInfo = await getTokenInfo(args.token, { signal: args.signal });
  if (tokenInfo.mfa !== 'Used') throw new MfaRequiredError();
  setToken(args.token, args.expiresAt);
  qc.setQueryData(ME_KEY, me);
  qc.setQueryData(tokenInfoOptions(args.token).queryKey, tokenInfo);
  scheduleAuthExpiry(qc, args.expiresAt.getTime());
  return me;
}

export function clearAuthCache(qc: QueryClient): void {
  cancelAuthExpiry();
  clearToken();
  qc.removeQueries({ queryKey: AUTH_ROOT_KEY });
}

// Clears the cookie + expiry watchdog WITHOUT touching the React Query
// cache. useSignOut needs this split so it can flip the cookie (the
// source-of-truth signal) before navigating away, while deferring
// cache eviction until after the gated tree has unmounted; eviction
// before navigate makes useMe() throw mid-flight.
export function clearAuthSession(): void {
  cancelAuthExpiry();
  clearToken();
}

// Local expiry watchdog. Some downstream services don't reliably
// 401 on expired tokens, so don't trust the 401 interceptor alone:
// schedule a timer at the cookie's expiry and evict locally.
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

// Browsers clamp setTimeout delays at INT32_MAX (~24.8 days); a longer
// delay overflows to ~0 and the watchdog fires immediately. Re-arm in
// chunks so a long-lived token still gets evicted at the right moment.
const MAX_TIMEOUT_MS = 0x7fffffff;

function scheduleAuthExpiry(qc: QueryClient, expiresAtMs: number): void {
  cancelAuthExpiry();
  const ms = expiresAtMs - Date.now();
  if (ms <= 0) {
    clearAuthCache(qc);
    return;
  }
  const wait = Math.min(ms, MAX_TIMEOUT_MS);
  expiryTimer = setTimeout(() => {
    expiryTimer = null;
    if (wait < ms) {
      scheduleAuthExpiry(qc, expiresAtMs);
    } else {
      clearAuthCache(qc);
    }
  }, wait);
}

function cancelAuthExpiry(): void {
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

// Cross-tab cookie sync: cookies don't fire events but localStorage
// does, on every tab *except* the writing one. That's exactly the
// semantic we want. setToken/clearToken write AUTH_SIGNAL_KEY with `set:<ts>`
// or `cleared:<ts>`, so this listener routes by intent without
// consulting the cookie or refetching `/me` (we already know the
// answer for the cleared case).
export function installCrossTabAuthSync(qc: QueryClient): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== AUTH_SIGNAL_KEY) return;
    const value = e.newValue ?? '';
    if (value.startsWith('cleared:')) {
      qc.setQueryData(ME_KEY, null);
      qc.removeQueries({ queryKey: SESSIONS_KEY });
      cancelAuthExpiry();
      return;
    }
    if (value.startsWith('set:')) {
      void qc.invalidateQueries({ queryKey: AUTH_ROOT_KEY });
      const expiry = getExpiry();
      if (expiry !== null) scheduleAuthExpiry(qc, expiry);
      return;
    }
    // Unknown value (e.g. legacy `removeItem`-style writes from before
    // the signal carried state, or external tooling): fall back to the
    // safe invalidate-and-refetch path.
    void qc.invalidateQueries({ queryKey: AUTH_ROOT_KEY });
    const expiry = getExpiry();
    if (expiry !== null) scheduleAuthExpiry(qc, expiry);
    else cancelAuthExpiry();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

// Rearms the expiry watchdog from the persisted mirror so a page
// reload during a live session keeps the timer active.
export function installAuthExpiryWatcher(qc: QueryClient): () => void {
  const expiry = getExpiry();
  if (expiry !== null) scheduleAuthExpiry(qc, expiry);
  return cancelAuthExpiry;
}

// Wires client.ts's 401 interceptor: any 401 from any kbase auth
// endpoint invalidates the auth cache so the gate's next
// ensureQueryData refetches against the (now stale) cookie.
export function installAuthFailureInterceptor(qc: QueryClient): () => void {
  setAuthFailureHandler(() => {
    void qc.invalidateQueries({ queryKey: AUTH_ROOT_KEY });
  });
  return () => setAuthFailureHandler(null);
}
