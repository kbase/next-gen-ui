import { useMemo, useState } from 'react';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Alert, Button, Field, Frame, Input } from '@kbase/design-system';

import {
  AUTH_ORIGIN,
  parseSafeRedirect,
  primeAuthCache,
  safeRedirect,
  useMaybeMe,
  useSignOut,
} from '../../api/auth';
// Official ORCID iD mark from Wikimedia Commons. ORCID brand
// guidelines require the asset be used unmodified.
import orcidIdUrl from '../../assets/orcid-id.svg';

const SearchSchema = z.object({
  redirect: z.string().optional(),
  error: z.literal('mfa-required').optional(),
});

export const Route = createFileRoute('/login/')({
  validateSearch: SearchSchema.parse,
  beforeLoad: ({ context, search }) => {
    // Only bounce when the user came in via ?redirect=… from the
    // gate. Direct visits (no redirect param) render the login page
    // even when signed in. useSignOut's navigate({ to: '/login' })
    // depends on this so it doesn't bounce back into the gated tree
    // while the auth cache is being evicted.
    if (search.redirect && context.queryClient.getQueryData(['auth', 'me'])) {
      const target = parseSafeRedirect(search.redirect);
      throw redirect({ to: target.pathname, search: target.search, hash: target.hash });
    }
  },
  component: LoginPage,
  staticData: { title: 'Sign in' },
});

function LoginPage() {
  const { redirect: redirectParam, error } = Route.useSearch();
  const nextRequest = safeRedirect(redirectParam);
  const me = useMaybeMe();
  const signOut = useSignOut();

  const isSignedIn = me !== null;
  const mfaRequired = error === 'mfa-required';

  const continueUrl = useMemo(() => {
    const url = new URL(`${window.location.origin}/login/continue`);
    url.searchParams.set('state', JSON.stringify({ nextRequest }));
    return url.toString();
  }, [nextRequest]);

  const actionUrl = `${AUTH_ORIGIN}/services/auth/login/start/`;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--s-9)',
        background: 'var(--c-bg)',
        padding: 'var(--s-9)',
      }}
    >
      <Frame paddingY={11} paddingX={9} style={{ width: 'min(380px, 100%)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 'var(--s-10)',
          }}
        >
          <img src="/kbase-logo-ref.png" alt="KBase" height={44} />
        </div>

        {mfaRequired && (
          <div style={{ marginBottom: 'var(--s-7)' }}>
            <Alert color="red">
              <strong>Two-factor authentication required.</strong> KBase only accepts ORCID sessions
              authenticated with 2FA. Enable 2FA on your ORCID account, then sign in again.
            </Alert>
          </div>
        )}

        {isSignedIn && me && (
          <div style={{ marginBottom: 'var(--s-7)' }}>
            <Alert color="primary">
              Signed in as <strong>{me.display}</strong>.{' '}
              <Link to="/" className="link">
                Continue to KBase
              </Link>{' '}
              or{' '}
              <button
                type="button"
                className="link"
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
              >
                {signOut.isPending ? 'Signing out…' : 'sign out'}
              </button>{' '}
              to use a different account.
            </Alert>
          </div>
        )}

        <form action={actionUrl} method="post">
          <input type="hidden" name="redirecturl" value={continueUrl} />
          <Button
            type="submit"
            name="provider"
            value="ORCID"
            variant="primary"
            disabled={isSignedIn}
            style={{ width: '100%', justifyContent: 'center', gap: 'var(--s-3)' }}
          >
            <img src={orcidIdUrl} alt="" width={16} height={16} aria-hidden="true" />
            Sign in with ORCID
          </Button>
        </form>

        {import.meta.env.DEV && <DevSignIn nextRequest={nextRequest} disabled={isSignedIn} />}
      </Frame>

      <footer className="login__footer">
        <a href="https://www.kbase.us/support/" target="_blank" rel="noopener noreferrer">
          Trouble signing in?
        </a>
        <a href="https://www.kbase.us/" target="_blank" rel="noopener noreferrer">
          About KBase
        </a>
      </footer>
    </div>
  );
}

// Dev-only: paste an existing kbase_session token to skip the OAuth
// round-trip. primeAuthCache validates against /api/V2/me before
// writing the cookie. Stripped in production by import.meta.env.DEV.
function DevSignIn({ nextRequest, disabled }: { nextRequest: string; disabled?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = token.trim();
    if (!trimmed) {
      setError('Token is required');
      return;
    }
    setPending(true);
    try {
      await primeAuthCache(qc, {
        token: trimmed,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
      const target = parseSafeRedirect(nextRequest);
      await navigate({
        to: target.pathname,
        search: target.search,
        hash: target.hash,
        replace: true,
      });
    } catch (err) {
      // Successful navigate unmounts the route; only reach here on failure.
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setPending(false);
    }
  }

  return (
    <section className="login__dev">
      <form onSubmit={onSubmit}>
        <Field.Root>
          <Field.Label>Dev: kbase_session token</Field.Label>
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
            placeholder="Paste token"
            disabled={pending || disabled}
          />
        </Field.Root>
        <Button
          type="submit"
          variant="outline"
          disabled={pending || disabled}
          style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--s-5)' }}
        >
          {pending ? 'Validating…' : 'Sign in with token'}
        </Button>
      </form>
      {error && (
        <div style={{ marginTop: 'var(--s-5)' }}>
          <Alert color="red">{error}</Alert>
        </div>
      )}
    </section>
  );
}
