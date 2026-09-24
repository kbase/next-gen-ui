# `src/api/auth/`

ORCID-only sign-in against the kbase auth service. Session token is
stored in a `.kbase.us` cookie, shared with the legacy UI and
narratives. The wire protocol is mirrored exactly; the implementation
is not (kbase-ui uses Redux + RTK Query effect chains).

Reference implementation for cross-checking: `work/ui/src/common/api/authService.ts`
and `work/ui/src/features/login/LogIn.tsx` (in this workspace).

---

## Layered files

Strict downward dependencies: each file imports only from layers
below it. New backends (workspace, narrative, …) follow the same
shape as a sibling directory under `src/api/`.

| File          | Concern                                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemas.ts`  | Zod schemas + derived TS types. Wire format only.                                                                                                                                                                |
| `client.ts`   | Pure async HTTP fns. AbortSignal-aware. Errors throw `AuthApiError`.                                                                                                                                             |
| `cookie.ts`   | `kbase_session` cookie get/set/clear. Owns Domain attribute. Cross-tab signal key. Expiry mirror in localStorage.                                                                                                |
| `idents.ts`   | `findOrcid()`. Picks the ORCID entry out of `Me.idents`.                                                                                                                                                         |
| `redirect.ts` | `safeRedirect()` / `parseSafeRedirect()`. Open-redirect sanitizer + nav-shape helper.                                                                                                                            |
| `errors.ts`   | `authErrorMessage(err, opts?)`. User-facing translation; `{ context: 'signin' }` swaps in sign-in phrasings on 401/403 and 5xx.                                                                                  |
| `queries.ts`  | TanStack Query bindings. `authMeOptions`, `authSessionsOptions`, `primeAuthCache`, `clearAuthCache`, `clearAuthSession`, `installCrossTabAuthSync`, `installAuthFailureInterceptor`, `installAuthExpiryWatcher`. |
| `hooks.ts`    | React layer. `useMe` / `useMaybeMe` / `useSessions` / `useSignOut` / `useUpdateMe` / `useRevokeOtherSession`.                                                                                                    |
| `index.ts`    | Barrel. The public surface. Import from here.                                                                                                                                                                    |

---

## Wire contract

Every call sets `credentials: 'include'`. The auth service reflects
`Access-Control-Allow-Credentials: true` for kbase.us-origin requests,
so the cookie is sent alongside the bearer on every endpoint,
matching kbase-ui's `kbaseBaseQuery` behavior.

| Operation            | Method, URL                                             | Auth                                       | Body / params           |
| -------------------- | ------------------------------------------------------- | ------------------------------------------ | ----------------------- |
| Validate token       | `GET {AUTH_ORIGIN}/services/auth/api/V2/me`             | `Authorization: <raw-token>` (no `Bearer`) | –                       |
| Token info (current) | `GET {AUTH_ORIGIN}/services/auth/api/V2/token`          | raw token                                  | –                       |
| Update profile       | `PUT {AUTH_ORIGIN}/services/auth/me`                    | raw token                                  | `{ display, email }`    |
| Login choice         | `GET {AUTH_ORIGIN}/services/auth/login/choice`          | in-process cookie (no Authorization)       | –                       |
| Login pick           | `POST {AUTH_ORIGIN}/services/auth/login/pick`           | in-process cookie (no Authorization)       | `{ id, policyids: [] }` |
| List sessions        | `GET {AUTH_ORIGIN}/services/auth/tokens/`               | raw token (Login-type only)                | –                       |
| Revoke session       | `DELETE {AUTH_ORIGIN}/services/auth/tokens/revoke/{id}` | raw token                                  | –                       |

**Important quirks.** Encode these as constants and don't drift:

- The `Authorization` header is the raw token. **No `Bearer ` prefix.**
  The auth service rejects `Bearer …` with 401.
- `/services/auth/tokens/` only accepts **Login**-type tokens. A
  Developer or Service token gets 403. The Sessions panel surfaces
  the 403 in an Alert; no `/api/V2/token` fallback row (matching
  kbase-ui).
- No `POST /services/auth/logout` endpoint. Sign-out is composed:
  `GET /api/V2/token` (to learn the current token's id) →
  `DELETE /tokens/revoke/{id}`. Same as kbase-ui's `useLogout`.
  Failure mode diverges: local state is cleared even on revoke
  failure (best-effort), where kbase-ui aborts with a toast.
- `useSignOut` runs in the order: navigate to `/login`, evict the
  React Query auth cache, fire revoke (best-effort), then clear the
  cookie. Navigate first so the gated tree unmounts cleanly (the
  cache eviction would otherwise make `useMe()` throw mid-flight).
  Cookie clear runs last because some revoke responses carry a
  `Set-Cookie: kbase_session=…` that would resurrect the just-cleared
  session if cleared first; running `clearToken()` last
  unconditionally overwrites whatever the response sent.
  `clearAuthSession()` (cookie + watchdog, no cache touch) is the
  primitive used by this last step. `clearAuthCache(qc)` is the
  full-eviction primitive used elsewhere.

---

## Flow

1. `/login` form-POSTs to `{AUTH_ORIGIN}/services/auth/login/start/`
   with `provider=ORCID`,
   `redirecturl=<our-origin>/login/continue?state=<json>`, and
   `environment=<name>` when `AUTH_ENVIRONMENT` is set. The state blob
   carries `{ nextRequest }` per kbase-ui's pattern. The destination
   travels inside a query param because the auth service stores
   `redirecturl` in a cookie: a raw `;` ends the cookie value
   (`/x?q=a;b` is stored as `/x?q=a`) and a raw `"` gets a 400;
   `URLSearchParams` encodes both.
2. Auth service redirects through ORCID and back to the landing URL
   configured for the environment, `/login/continue`, with an
   in-process cookie set on `.kbase.us`.
3. `/login/continue` calls `getLoginChoice()` then `postLoginPick(...)`
   to exchange the in-process cookie for a session token, then
   `primeAuthCache(qc, { token, expiresAt })` writes the
   `kbase_session` cookie _and_ seeds the auth query cache atomically.
   Validation runs _before_ the cookie is written, so failure leaves
   no state behind.
4. `nextRequest` is read from the `redirecturl` the pick response
   echoes back, as kbase-ui does; the landing URL carries no `state`.
   It round-trips through the auth service unsigned, so it's treated
   as untrusted regardless of source.
5. Subsequent navigation to private routes is gated by the root
   `beforeLoad`, which `ensureQueryData(authMeOptions())`s and
   redirects to `/login?redirect=<href>` on `null`. Visiting `/login`
   _with_ a `redirect` param while signed in immediately redirects
   to that target; direct visits (no param) render the page so
   `useSignOut`'s navigate-to-`/login` doesn't bounce.

---

## `safeRedirect` and `parseSafeRedirect`

Two helpers with different return shapes for two consumers.

`safeRedirect(input): string` is the sanitizer used at both ends of
the login flow. Accepts:

- a path beginning with `/` and not `//`, or
- an absolute URL whose `origin === window.location.origin`.

Otherwise returns `'/'`. The same-origin URL parse rejects absolute
foreign URLs, exotic schemes (`javascript:`, `data:`, `mailto:`),
and protocol-relative inputs. Flat string return for the
`?redirect=` search param round-trip.

`parseSafeRedirect(input): { pathname, search?, hash? }` is for use
with TanStack Router's `redirect({ to, search, hash })`. Calls
`safeRedirect()` and splits the result via `URL`. Required because
`to:` is a route-path template, not a URL: passing `'/foo?bar=1'`
bakes the `?` into the pathname and the router fails to match.

Tests: `redirect.test.ts`.

---

## Cross-tab session sync

Cookies don't fire cross-tab events; localStorage does.
`setToken` / `clearToken` mirror writes/clears into a tiny
`kbase_session_signal` localStorage key (`set:<ts>` or
`cleared:<ts>`, never the token). `installCrossTabAuthSync(qc)`
registers a `storage` listener at app boot that routes by intent:
`cleared:` sets the cached `me` to `null` and removes the sessions
query (no refetch needed; the answer is known); `set:` invalidates
`['auth']` and rearms the expiry watchdog from the persisted
expiry mirror; an unknown value falls back to invalidate. So a
sign-in or sign-out in one tab propagates without polling.

A separate `kbase_session_expires_at` localStorage key holds the
expiry as unix-ms. `installAuthExpiryWatcher(qc)` rearms the
in-process watchdog from this mirror at app boot, so a page reload
during a live session keeps the timer active.

The signal is a notification, not the source of truth. The cookie
is. XSS surface is unchanged.

---

## Token storage trade-off

`kbase_session` is a JS-set cookie. It can't be `HttpOnly` because
the design point (cross-subdomain SSO) requires the cookie to be
readable from JS on every kbase subdomain. Tokens never go in URLs,
logs, or `localStorage`. Cookie attributes:

- `Domain` is set from `VITE_COOKIE_DOMAIN` when defined (override).
  Otherwise: `.kbase.us` when the runtime hostname is `kbase.us` or
  `*.kbase.us`; omitted everywhere else (so localhost dev still
  works without a Domain attribute landing the cookie on the wrong
  scope).
- `Path=/`
- `Secure` on https
- `SameSite=Lax`

---

## Why `kbase.us` for auth and `app.kbase.us` for deploy

- **Auth host** must be the canonical apex `kbase.us`. Pointing
  `VITE_AUTH_ORIGIN` at a peer like `narrative.kbase.us` causes the
  in-process cookie set during the redirect chain to land on the
  wrong domain and the callback fails.
- **Deploy host** is `app.kbase.us`, a peer subdomain. That still
  exercises the cross-subdomain shared-cookie path: `kbase_session`
  is set on `.kbase.us` so any kbase subdomain (this app,
  narratives, the legacy UI) reads the same session.

---

## Local dev

`.env.development` (committed) points local dev at `ci.kbase.us`,
so a CI-issued token signs in without touching prod. Personal
overrides go in `.env.development.local` (gitignored).

The full ORCID round-trip works only on a real `*.kbase.us` host.
For local work: use the **dev sign-in** affordance on `/login`
(visible only when `import.meta.env.DEV`). Paste a known-good
token; `primeAuthCache` validates against `/api/V2/me` and seeds
the cookie + cache atomically.

Manual cookie set in DevTools also works:

```js
document.cookie = 'kbase_session=<known-good-token>; path=/';
```

…then reload. The gate's `ensureQueryData` reads the cached `me`
on subsequent navigations; it doesn't refetch unless the cache is
invalidated by the 401 interceptor or the cross-tab signal.

---

## Tests

Highest-leverage coverage:

- `redirect.test.ts`: `safeRedirect` open-redirect bypasses
  (encoded slashes, exotic schemes, protocol-relative); `parseSafeRedirect`
  pathname/search/hash split.
- `cookie.test.ts`: `getToken` decode safety (URIError, empty value),
  round-trip.
- `queries.test.ts`: `primeAuthCache` atomicity (rejected token
  leaves no cookie); `clearAuthCache` namespace scope;
  `installCrossTabAuthSync` storage-event behavior + unsubscribe.
- `routes/__root.test.tsx` (in the routes dir, not here): gate
  paths: 401 redirect, 5xx error boundary, layout branch, cookie
  forwarded as `Authorization`.

Add tests when touching the wire layer or invariants.

---

## Troubleshooting

**Sign-in succeeds at ci.kbase.us but the app immediately bounces
back to `/login`:**
The `kbase_session` cookie didn't land where it could be read.
Check `VITE_COOKIE_DOMAIN` against the host you're served on;
locally it should be unset.

**`/account` shows "Couldn't load sessions" (403):**
The current token isn't a Login-type token. The
`/services/auth/tokens/` endpoint only accepts Login tokens
(auth-service policy). Sign in via the ORCID flow rather than dev
token paste; Developer / Service tokens can't enumerate or manage
sessions.

**`Authorization: Bearer …` returns 401:**
The kbase auth service expects the raw token without a `Bearer `
prefix. Check `client.ts` if you're seeing this in new code.
