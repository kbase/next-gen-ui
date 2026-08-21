import { useState } from 'react';
import { Link, createFileRoute, isRedirect, redirect, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Alert, Button, Frame, Loader } from '@kbase/design-system';

import {
  MfaRequiredError,
  authErrorMessage,
  AUTH_ENABLED,
  getLoginChoice,
  parseSafeRedirect,
  postLoginPick,
  primeAuthCache,
} from '../../api/auth';

// `state` is the OAuth state parameter; the auth service round-trips it
// through ORCID and back to /login/continue. We pack the post-login
// destination into it as JSON because (a) the state param has explicit
// preservation semantics where arbitrary other query params may not,
// and (b) it's what kbase-ui does (utils.ts:28-35, LogInContinue.tsx:26-39).
const SearchSchema = z.object({
  state: z.string().max(2048).optional(),
});

// Strict on `nextRequest` only; future kbase auth state additions
// drop here silently. By design, we don't speculate on unknown
// fields' meanings.
const StateSchema = z.object({
  nextRequest: z.string().default('/'),
});

type PickEntry = { id: string; user?: string };
type LoaderResult =
  | { kind: 'create' }
  | { kind: 'pick'; entries: PickEntry[]; nextRequest: string }
  | { kind: 'error'; message: string };

function parseState(stateRaw: string | undefined): { nextRequest: string } {
  if (!stateRaw) return { nextRequest: '/' };
  try {
    return StateSchema.parse(JSON.parse(stateRaw));
  } catch {
    return { nextRequest: '/' };
  }
}

const FALLBACK_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;
function fallbackExpiresAt(): Date {
  return new Date(Date.now() + FALLBACK_EXPIRY_MS);
}

export const Route = createFileRoute('/login/continue')({
  validateSearch: SearchSchema.parse,
  loaderDeps: ({ search }) => ({ stateRaw: search.state }),
  loader: async ({ context, deps }): Promise<LoaderResult> => {
    const { nextRequest } = parseState(deps.stateRaw);
    const target = parseSafeRedirect(nextRequest);

    // Nothing can have issued this callback with no auth service, so this
    // is a stale bookmark. Without the guard the request goes to a relative
    // path nginx answers with index.html, and the user gets a schema error.
    if (!AUTH_ENABLED) {
      return { kind: 'error', message: 'Sign-in is not available.' };
    }

    try {
      const choice = await getLoginChoice();
      const logins = choice.login ?? [];

      // Multi-entry: surface a chooser. Picking the account a user
      // becomes is security-relevant; never array-index it.
      if (logins.length > 1) {
        return {
          kind: 'pick',
          entries: logins.map((e) => ({ id: e.id, user: e.user })),
          nextRequest,
        };
      }

      if (logins.length === 1) {
        const result = await postLoginPick({ id: logins[0].id, policyids: [] });
        if (!result.token.expires) {
          console.warn(
            'Auth service returned LoginPickResult without `expires`; using 14-day fallback',
          );
        }
        const expiresAt = result.token.expires
          ? new Date(result.token.expires)
          : fallbackExpiresAt();
        await primeAuthCache(context.queryClient, {
          token: result.token.token,
          expiresAt,
        });
        throw redirect({
          to: target.pathname,
          search: target.search,
          hash: target.hash,
          replace: true,
        });
      }

      if (choice.create && choice.create.length > 0) {
        return { kind: 'create' };
      }

      return { kind: 'error', message: 'No login choice available.' };
    } catch (err) {
      if (isRedirect(err)) throw err;
      if (err instanceof MfaRequiredError) {
        throw redirect({ to: '/login', search: { error: 'mfa-required' } });
      }
      return { kind: 'error', message: authErrorMessage(err, { context: 'signin' }) };
    }
  },
  component: LoginContinuePage,
  pendingComponent: LoginContinuePending,
  pendingMs: 0,
  preload: false,
  staticData: { title: 'Signing in…' },
});

function LoginContinuePending() {
  return (
    <CenteredFrame>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-5)' }}>
        <Loader />
        <span className="body">Signing you in…</span>
      </div>
    </CenteredFrame>
  );
}

function LoginContinuePage() {
  const result = Route.useLoaderData();

  if (result.kind === 'pick') {
    return <LoginChooser entries={result.entries} nextRequest={result.nextRequest} />;
  }

  return (
    <CenteredFrame>
      {result.kind === 'create' && (
        <Alert color="primary">
          <div className="h3">Account creation isn't enabled here yet.</div>
          <p className="body" style={{ marginTop: 'var(--s-3)' }}>
            Please sign in with an existing KBase account.
          </p>
          <p style={{ marginTop: 'var(--s-5)' }}>
            <Link to="/login">Back to sign in</Link>
          </p>
        </Alert>
      )}

      {result.kind === 'error' && (
        <Alert color="red">
          <div className="h3">We couldn't sign you in.</div>
          <p className="body" style={{ marginTop: 'var(--s-3)' }}>
            {result.message}
          </p>
          <p style={{ marginTop: 'var(--s-5)' }}>
            <Link to="/login">Try again</Link>
          </p>
        </Alert>
      )}
    </CenteredFrame>
  );
}

function LoginChooser({ entries, nextRequest }: { entries: PickEntry[]; nextRequest: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const target = parseSafeRedirect(nextRequest);

  async function pick(id: string) {
    setPendingId(id);
    setError(null);
    try {
      const result = await postLoginPick({ id, policyids: [] });
      const expiresAt = result.token.expires ? new Date(result.token.expires) : fallbackExpiresAt();
      await primeAuthCache(qc, { token: result.token.token, expiresAt });
      await navigate({
        to: target.pathname,
        search: target.search,
        hash: target.hash,
        replace: true,
      });
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        await navigate({ to: '/login', search: { error: 'mfa-required' }, replace: true });
        return;
      }
      setPendingId(null);
      setError(authErrorMessage(err, { context: 'signin' }));
    }
  }

  return (
    <CenteredFrame>
      <h2 className="h3" style={{ marginBottom: 'var(--s-3)' }}>
        Choose an account
      </h2>
      <p className="body" style={{ marginBottom: 'var(--s-7)' }}>
        Your ORCID is linked to more than one KBase account. Pick the one you want to sign in as.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        {entries.map((e) => (
          <Button
            key={e.id}
            type="button"
            variant="outline"
            onClick={() => pick(e.id)}
            disabled={pendingId !== null}
            style={{ justifyContent: 'flex-start' }}
          >
            {pendingId === e.id ? 'Signing in…' : (e.user ?? e.id)}
          </Button>
        ))}
      </div>
      {error && (
        <div style={{ marginTop: 'var(--s-7)' }}>
          <Alert color="red">{error}</Alert>
        </div>
      )}
    </CenteredFrame>
  );
}

function CenteredFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--c-bg)',
        padding: 'var(--s-9)',
      }}
    >
      <Frame paddingY={10} paddingX={8} style={{ width: 'min(420px, 100%)' }}>
        {children}
      </Frame>
    </div>
  );
}
