import {
  Link,
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { Alert, Avatar, Button, Frame, Loader, NavIcon, Tooltip } from '@kbase/design-system';
import { MapTrifold } from '@phosphor-icons/react';

import {
  AuthApiError,
  authMeOptions,
  clearAuthCache,
  safeRedirect,
  tokenInfoOptions,
  useMaybeMe,
} from '../api/auth';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    title?: string;
  }
}

export interface RouterContext {
  queryClient: QueryClient;
}

// The design system is documentation, so it is readable without an account.
// /portals is the public front door: a gallery of published portals that
// anyone can browse before they have a KBase identity.
const PUBLIC_ROUTES: ReadonlyArray<string> = [
  '/login',
  '/login/continue',
  '/design-system',
  '/portals',
];

function isPublic(pathname: string): boolean {
  // Trailing slashes reach the gate verbatim -- a pasted `/portals/`, or a
  // browser replaying a cached 301 from an older build. Exact matching would
  // send those to /login even though the route is public.
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PUBLIC_ROUTES.includes(normalized);
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context, location }) => {
    if (isPublic(location.pathname)) return;
    const me = await context.queryClient.ensureQueryData(authMeOptions());
    if (!me) {
      throw redirect({
        to: '/login',
        search: { redirect: safeRedirect(location.href) },
      });
    }
    // Catches cookies pre-dating the MFA requirement.
    const tokenInfo = await context.queryClient.ensureQueryData(tokenInfoOptions());
    if (tokenInfo.mfa !== 'Used') {
      clearAuthCache(context.queryClient);
      throw redirect({ to: '/login', search: { error: 'mfa-required' } });
    }
  },
  component: RootLayout,
  errorComponent: RootError,
  pendingComponent: RootPending,
});

// Strip the `<label> failed:` prefix apiFailure encodes (useful in
// dev console traces, not the UI).
function formatErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return err.message.replace(/^[A-Za-z]+ failed: /, '');
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

function RootError({ error }: { error: unknown }) {
  // Unconditional so hook order stays stable across the redirect-
  // throw vs. retry-render paths.
  const router = useRouter();

  if (error instanceof AuthApiError && error.status === 401) {
    throw redirect({ to: '/login' });
  }

  const message = formatErrorMessage(error);

  return (
    <CenteredFrame>
      <Alert color="red">
        <div className="h3">Something went wrong.</div>
        <p className="body" style={{ marginTop: 'var(--s-3)' }}>
          {message}
        </p>
      </Alert>
      <div style={{ display: 'flex', gap: 'var(--s-4)', marginTop: 'var(--s-7)' }}>
        <Button type="button" variant="primary" onClick={() => void router.invalidate()}>
          Retry
        </Button>
      </div>
    </CenteredFrame>
  );
}

function RootPending() {
  return (
    <CenteredFrame>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-5)' }}>
        <Loader label="Loading" />
        <span className="body">Loading…</span>
      </div>
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

function RootLayout() {
  const { pathname, matches } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, matches: s.matches }),
  });
  const isAuthLayout = isPublic(pathname);

  return (
    <>
      {isAuthLayout ? <AuthLayout /> : <AppLayout pathname={pathname} matches={matches} />}
      {import.meta.env.DEV && (
        <>
          {/* Default bottom-left collides with the sidebar avatar; top-right is empty. */}
          <TanStackRouterDevtools position="top-right" />
          <ReactQueryDevtools buttonPosition="bottom-right" />
        </>
      )}
    </>
  );
}

function AuthLayout() {
  return <Outlet />;
}

function AppLayout({
  pathname,
  matches,
}: {
  pathname: string;
  matches: ReadonlyArray<{ staticData?: { title?: string } }>;
}) {
  const last = matches[matches.length - 1];
  const title = last?.staticData?.title;

  const me = useMaybeMe();
  const initial = me ? me.display.charAt(0).toUpperCase() : '?';
  const accountActive = pathname.startsWith('/account');

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__sidebar-inner">
          <div className="app-shell__sidebar-header">
            <svg
              className="app-shell__brand"
              width="24"
              height="16"
              viewBox="0 0 34 28"
              aria-hidden="true"
            >
              <circle cx="7" cy="14" r="8" fill="var(--c-yellow)" opacity="0.85" />
              <circle cx="17" cy="14" r="8" fill="var(--c-grellow)" opacity="0.85" />
              <circle cx="27" cy="14" r="8" fill="var(--c-ocean)" opacity="0.85" />
            </svg>
          </div>

          <div className="app-shell__sidebar-nav">
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <NavIcon active={pathname === '/'} aria-label="Roadmap" asChild>
                    <Link to="/">
                      <MapTrifold size={17} weight={pathname === '/' ? 'fill' : 'regular'} />
                    </Link>
                  </NavIcon>
                }
              />
              <Tooltip.Popup side="right" sideOffset={8}>
                Roadmap
              </Tooltip.Popup>
            </Tooltip.Root>

            <div className="app-shell__spacer" />

            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Link
                    to="/account"
                    className={`app-shell__avatar-link${accountActive ? ' app-shell__avatar-link--active' : ''}`}
                    aria-label={`Account${me ? ` (${me.display})` : ''}`}
                    aria-current={accountActive ? 'page' : undefined}
                  >
                    <Avatar size={24} variant="solid" color="primary">
                      {initial}
                    </Avatar>
                  </Link>
                }
              />
              <Tooltip.Popup side="right" sideOffset={8}>
                {me?.display ?? 'Account'}
              </Tooltip.Popup>
            </Tooltip.Root>
          </div>
        </div>
      </aside>

      <main className="app-shell__main">
        <header className="app-shell__header">
          {title && <span className="h2">{title}</span>}
          <div className="app-shell__header-spacer" />
        </header>

        <div className="app-shell__body">
          <div className="app-shell__body-inner">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
