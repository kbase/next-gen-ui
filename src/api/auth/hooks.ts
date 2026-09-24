import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { logout, revokeSession, setMe } from './client';
import { clearBackupTokenIf, getToken } from './cookie';
import { authMeOptions, authSessionsOptions, clearAuthSession, tokenInfoOptions } from './queries';
import type { Me, MeUpdate } from './schemas';

// Inside any route gated by the root beforeLoad, the auth cache is
// guaranteed to hold a non-null Me. Components rendering above the
// gate (e.g. the topbar shell) should use useMaybeMe() instead.
export function useMe(): Me {
  const { data } = useQuery(authMeOptions());
  if (!data) {
    throw new Error(
      'useMe() called without an authenticated session. Use useMaybeMe() above the gate.',
    );
  }
  return data;
}

/** Any session /me accepts, with or without 2FA. */
export function useMaybeMe(): Me | null {
  const { data } = useQuery(authMeOptions());
  return data ?? null;
}

/** A session /me accepts that used 2FA: the root gate's rule. */
export function useSignedInMe(): Me | null {
  const me = useMaybeMe();
  const { data: tokenInfo } = useQuery({ ...tokenInfoOptions(), enabled: me !== null });
  return me && tokenInfo?.mfa === 'Used' ? me : null;
}

export function useSessions() {
  return useQuery(authSessionsOptions());
}

export function useRevokeOtherSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      await revokeSession(token, sessionId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (update: MeUpdate) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      await setMe(token, update);
    },
    // Optimistic merge + rollback so the form reflects the new
    // value immediately and reverts on server error.
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: ['auth', 'me'] });
      const prev = qc.getQueryData<Me>(['auth', 'me']);
      qc.setQueryData<Me>(['auth', 'me'], (old) => (old ? { ...old, ...variables } : old));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['auth', 'me'], ctx.prev);
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      // Order: navigate → cache evict → revoke → cookie clear.
      //
      // navigate first so the gated tree unmounts cleanly; useMe()
      // throws on null, so cache eviction must wait until after.
      // The eviction itself flips "Signed in as X" off (the alert
      // reads me, not the cookie). Revoke is best-effort. Cookie
      // clear runs LAST so any Set-Cookie on the revoke response
      // is overwritten by our explicit clearToken. The auth service
      // sends `Set-Cookie: kbase_session=…` on some revoke responses,
      // which would otherwise resurrect the just-cleared session.
      const token = getToken();
      await navigate({ to: '/login', replace: true });
      qc.removeQueries({ queryKey: ['auth'] });
      let revoked = false;
      if (token) {
        try {
          await logout(token);
          revoked = true;
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[useSignOut] revoke failed (best-effort):', err);
          }
        }
      }
      clearAuthSession();
      // After a failed revoke the token still works on other kbase.us sites.
      if (revoked && token) clearBackupTokenIf(token);
    },
  });
}
