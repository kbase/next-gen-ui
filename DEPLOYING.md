# Deploying to Rancher2

How this app runs on a Rancher-managed Kubernetes cluster, and —
the part that actually bites — what the Ingress has to do so that
TanStack Router keeps working on hard navigations.

The short version: **serve the app at the root of its own
hostname, send every path to the pod unmodified, and cache
nothing at the edge.** Everything below is the reasoning behind
those three rules.

---

## What is being deployed

A static single-page app. `npm run build` emits `dist/`; the
image bakes `dist/` into `nginxinc/nginx-unprivileged` and serves
it on port 8080. There is no server-side rendering, no Node
process, no API layer of our own. The browser calls KBase services
directly rather than through this pod, which proxies nothing — today
that is the auth service at `AUTH_ORIGIN`, and every service added
later reaches the browser the same way.

Two consequences that shape the whole deployment:

- **Configuration is rendered when the container starts**, from
  the environment set on the **workload** — Rancher's term for the
  Deployment, and the vocabulary this doc uses throughout. The image
  carries no environment identity, so one tag is promoted from CI to
  prod rather than rebuilt per environment, and the workload's
  Environment Variables tab does what everyone expects it to. See
  [Runtime configuration](#runtime-configuration).
- **All routing below the hostname is the browser's job.** The
  pod's only routing rule is "serve the file if it exists,
  otherwise serve `index.html`". The Ingress must not try to help.

---

## The image

Built and pushed by `.github/workflows/docker.yml` to
`ghcr.io/kbase/next-gen-ui`, multi-arch (`linux/amd64`,
`linux/arm64`) with build provenance attestation.

| Tag pattern            | Produced by                         |
| ---------------------- | ----------------------------------- |
| `x.y.z`, `x.y`, `x`    | GitHub Release (semver tag)         |
| `latest`               | GitHub Release, non-prerelease only |
| `pr-<n>`, `prerelease` | PR from this repo (not forks)       |
| `sha-<short>`          | Any pushed build                    |

Deploy by **immutable tag** — `x.y.z` or `sha-<short>`. `latest`
plus `imagePullPolicy: Always` makes rollbacks guesswork and
makes a restarted pod silently diverge from its siblings.

Runtime facts the workload spec has to match:

| Fact            | Value                                       |
| --------------- | ------------------------------------------- |
| Listen port     | `8080` (unprivileged nginx; not 80)         |
| User            | uid `101`, non-root, no capabilities needed |
| Health endpoint | `GET /healthz` → `204`, access log off      |
| Writable paths  | `/tmp`, `/var/cache/nginx`                  |
| Document root   | `/usr/share/nginx/html`                     |

---

## The router contract with Ingress

`main.tsx` builds the router with `createRouter({ routeTree, … })`
— no `basepath` — and `vite.config.ts` sets no `base`. So the
bundle references its own chunks at absolute paths
(`/assets/index-<hash>.js`), and the router treats
`location.pathname` as starting at `/`.

TanStack Router is a history router, not a hash router. On a
client-side navigation the server sees nothing. But on a **hard
navigation** — first load, reload, a pasted deep link, the ORCID
redirect landing on `/login/continue`, a bookmark — the browser
issues a real GET for that exact path, and it has to arrive at
nginx intact. That is the entire ingress requirement, and it
breaks down into three rules.

### 1. Root of a hostname, no path prefix

The app must be reachable at `https://<host>/`, not
`https://<host>/next-gen-ui/`.

A prefix without a rewrite fails: the browser asks for
`/next-gen-ui/portals`, nginx has no such file, `try_files`
returns `index.html`, the bundle loads and then requests
`/assets/index-<hash>.js` — at the domain root, which the
Ingress does not route here. Blank page, 404s in the console.

A prefix _with_ `rewrite-target` fails differently: nginx now
sees `/portals` and serves the SPA, the bundle requests
`/assets/…` at the root, and again the Ingress does not route it.
The rewrite fixes the request path on the way in; it cannot fix
absolute URLs the bundle has already been built with.

Serving under a prefix would mean setting Vite's `base` and the
router's `basepath` to that prefix at build time, producing an
image that only works at that prefix. Don't. Give the app a
hostname.

### 2. Every path goes to the pod, unmodified

One rule, `pathType: Prefix`, `path: /`. Do not enumerate routes
in the Ingress — `/`, `/portals`, `/account`, `/login`,
`/login/continue`, `/design-system` — because that list goes
stale the moment someone adds a file under `src/routes/`, and a
path the Ingress doesn't know becomes an edge 404 that never
reaches the `try_files` fallback. The SPA fallback lives in
`nginx.conf` inside the pod, and that is the only place it should
live.

The gallery makes the hazard concrete, and it is worth knowing
that this one already bit: `/portals` is a route rendered by the
SPA, while the card thumbnails were once real files served from
the same prefix. They now live in `public/portal-thumbs/`, out
from under it.

It also has to be resolved correctly _inside_ the pod. The
original fallback was `try_files $uri $uri/ /index.html`, and
`$uri/` matched a same-named directory in the doc root before the SPA
fallback was ever reached — so `/portals` returned a 301 to
`/portals/`, which returned 403, because autoindex is off. The
gallery worked when clicked through from `/` and failed on every
deep link, reload, and bookmark. Nothing here is served by
directory listing, so `$uri/` has no legitimate use and the rule
is now:

```nginx
try_files $uri /index.html;
```

Two follow-on hazards from that class of bug:

- nginx builds redirects from its own `listen` port, so the 301
  above pointed at `http://<host>:8080/portals/` — behind an
  ingress terminating on 443, straight off the edge of the world.
  `absolute_redirect off;` keeps redirects relative.
- **Browsers cache 301s more or less permanently.** Anyone who
  loaded the broken build keeps being sent to `/portals/` from
  their own cache long after the server is fixed. That is why the
  root gate normalises trailing slashes (`isPublic()` in
  `src/routes/__root.tsx`) rather than matching pathnames
  exactly: `/portals/` has to stay public, or those users land on
  `/login` for a page that needs no account.

Also preserve the query string and don't touch the method:
`/login/continue?state=<json>` carries the OAuth state blob
round-tripped through the auth service. A `rewrite-target` with
capture groups is the usual way that gets dropped.

### 3. Nothing is cached or rewritten at the edge

`nginx.conf` already sets the cache policy the app depends on:
`Cache-Control: public, immutable` for `/assets/*` (Vite
fingerprints those filenames, so they are safe forever) and
`no-cache` for everything else, which in practice means
`index.html`.

If an ingress controller, CDN, or corporate proxy caches
`index.html`, a returning user gets an HTML document pointing at
hashed asset filenames that the current image no longer contains.
`location /assets/` ends in `try_files $uri =404`, so those come
back as 404s rather than as `index.html` served with the wrong
MIME type — the failure is loud, but it is still a broken page.
Because `defaultPreload: 'intent'` prefetches route chunks on
hover, this can surface as a route that fails on hover before the
user has clicked anything.

Likewise, don't add response headers at the edge. The pod already
sets `Content-Security-Policy`, `X-Content-Type-Options`,
`Referrer-Policy`, and `X-Frame-Options` in both `location`
blocks. An ingress annotation that adds a second CSP header does
not override the first — browsers enforce the _intersection_ of
every CSP header present, so the strictest combination wins and
you get failures (blocked font loads, a blocked form POST to the
auth service) that don't correspond to any policy anyone wrote.
If a header needs to change, change `nginx.conf`.

---

## Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: next-gen-ui
  namespace: next-gen-ui
  annotations:
    # TLS is required: the kbase_session cookie only gets the
    # Secure attribute on https, and ORCID will not redirect to
    # a plaintext callback.
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    cert-manager.io/cluster-issuer: <your-issuer>
spec:
  ingressClassName: nginx
  tls:
    - hosts: [next-gen.kbase.us]
      secretName: next-gen-ui-tls
  rules:
    - host: next-gen.kbase.us
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: next-gen-ui
                port:
                  number: 80
```

Deliberately absent, and worth keeping absent:

| Annotation                                | Why not                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `rewrite-target`                          | Breaks absolute `/assets/…` URLs and can drop the OAuth query string.      |
| `app-root` / `default-backend`            | The SPA fallback belongs in `nginx.conf`, not at the edge.                 |
| `configuration-snippet` with `add_header` | Duplicate CSP headers intersect; see above.                                |
| `affinity: cookie`                        | The app is stateless. Sticky sessions buy nothing and complicate rollouts. |
| `proxy-body-size`                         | Nothing is uploaded to this pod.                                           |

### Hostname choice is not cosmetic

`src/api/auth/cookie.ts` sets the `kbase_session` cookie's
`Domain` to `.kbase.us` when the browser is on `kbase.us` or any
`*.kbase.us` host, and omits `Domain` otherwise. Serving from a
host outside `kbase.us` therefore scopes the session cookie to
that single host: the app still works standalone, but
cross-subdomain SSO with the legacy UI and narratives silently
stops. If that is intentional, fine; if it isn't, either use a
`*.kbase.us` host or build with an explicit
`VITE_COOKIE_DOMAIN`.

The login flow also builds its `redirecturl` from
`window.location.origin` at runtime, so it follows whatever
hostname the browser is on — but the auth service must accept
that origin, and the ORCID hop must be able to redirect back to
it. A new hostname is a conversation with the auth service
owners, not just a DNS record.

---

## Workload and Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: next-gen-ui
  namespace: next-gen-ui
spec:
  replicas: 2
  selector:
    matchLabels: { app: next-gen-ui }
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  template:
    metadata:
      labels: { app: next-gen-ui }
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: web
          image: ghcr.io/kbase/next-gen-ui:0.1.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
              name: http
          securityContext:
            allowPrivilegeEscalation: false
            capabilities: { drop: ['ALL'] }
          readinessProbe:
            httpGet: { path: /healthz, port: http }
            initialDelaySeconds: 2
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz, port: http }
            initialDelaySeconds: 10
            periodSeconds: 20
          resources:
            requests: { cpu: 10m, memory: 32Mi }
            limits: { memory: 128Mi }
---
apiVersion: v1
kind: Service
metadata:
  name: next-gen-ui
  namespace: next-gen-ui
spec:
  selector: { app: next-gen-ui }
  ports:
    - name: http
      port: 80
      targetPort: http
```

Notes:

- `/healthz` returns **204**. Kubernetes treats any status from
  200 to 399 as a passing `httpGet` probe, so 204 is fine — but
  a probe configured as a TCP check or pointed at `/` will also
  "pass" on a broken deploy, since `try_files` answers `/` with
  `index.html` regardless. Point both probes at `/healthz`.
- The image already declares a Docker `HEALTHCHECK`. Kubernetes
  ignores it; the probes above are what the cluster acts on.
- Serving static files needs almost nothing. A CPU _limit_ on a
  workload this small mostly buys throttling during the burst of
  requests right after a rollout; a memory limit is the useful one.
- If cluster policy requires `readOnlyRootFilesystem: true`, mount
  `emptyDir`s at `/tmp` and `/var/cache/nginx` — nginx-unprivileged
  keeps its pid file and temp paths under `/tmp`. Verify against
  the pinned image version (`1.27-alpine`) before enabling it;
  a wrong path list shows up as CrashLoopBackOff on first request,
  not at startup.

### Rolling updates and asset skew

During a rollout, two replicas serve two different builds behind
one Service. A browser that loaded `index.html` from the new pod
can have a lazily-loaded route chunk request land on the old pod,
which returns 404 for the unknown hash. The router surfaces that
as a chunk-load error in `RootError`.

The window is short and a reload fixes it, so this is a known
rough edge rather than a solved problem. `maxUnavailable: 0` with
`maxSurge: 1` keeps it brief. If it becomes a real complaint, the
fix is to serve `/assets/` from a shared origin that holds both
builds, not to tune the Ingress.

---

## Runtime configuration

The image carries no environment identity. `docker build` takes no
build args, and the same tag is promoted from CI to staging to
prod — so the bytes you tested are the bytes you ship, which is
not true of a per-environment build.

Set these on the workload:

Every one of these is optional, and for each the difference between
unset and empty is load-bearing:

| Var             | Unset means                        | `''` means                             |
| --------------- | ---------------------------------- | -------------------------------------- |
| `AUTH_ORIGIN`   | no auth service in this deployment | same-origin (something proxies it)     |
| `COOKIE_DOMAIN` | derive from the current host       | omit the Domain attribute entirely     |
| `IDP_ORIGINS`   | `https://orcid.org`                | — (space-separated, for `form-action`) |

```yaml
env:
  - name: AUTH_ORIGIN
    value: https://kbase.us
  - name: COOKIE_DOMAIN
    value: .kbase.us
```

### Deploying without an auth service

Leaving `AUTH_ORIGIN` unset is a supported configuration, not a
misconfiguration — it is the initial rollout, before an auth route
exists. The container starts normally and logs which mode it is in.

What changes:

- Public routes (`/portals`, `/login`, `/login/continue`,
  `/design-system`) render exactly as they otherwise would. They do
  not call the auth service at all: the root gate returns early for
  them before any query runs.
- `/login` replaces the ORCID button with a plain statement that
  sign-in is unavailable. This matters more than it sounds: with no
  auth origin the form would POST to a same-origin path, nginx
  would answer it with `index.html`, and the user would land on a
  copy of the login page with no explanation of what went wrong.
- `validateToken` short-circuits to `null` — the same answer it
  gives for an unrecognised token — so a stale `kbase_session`
  cookie cannot provoke a request to a URL that does not exist.
  Private routes therefore bounce to `/login`, which explains
  itself.
- The CSP's `connect-src` and `form-action` collapse to `'self'`,
  since there is no auth origin to allow.

Only public routes are treated as needing to work in this mode.
Private routes are reachable only by someone who could not have
signed in.

### How it works

`docker-entrypoint.d/05-render-config.sh` runs before nginx starts
— the nginx image execs everything in `/docker-entrypoint.d` — and
renders two files from pristine templates:

- `nginx.conf` → `/etc/nginx/conf.d/default.conf`, filling the
  CSP's `connect-src`, `form-action`, and the theme-init
  `script-src` hash.
- `index.html`, filling `<meta name="config:auth-origin">` and
  `<meta name="config:cookie-domain">`, which `src/config.ts`
  reads synchronously at module load.

Meta tags rather than an inline `<script>` because the CSP blocks
inline script unless it is named by hash, and a hash over
per-environment values would have to be recomputed inside the boot
script. Meta content is not script. And unlike a fetched
`config.json`, the values are there before the bundle parses, so
`AUTH_ORIGIN` stays a plain `const` and the auth client never
becomes async.

Rendering from pristine templates rather than editing in place
keeps the operation idempotent: the entrypoint runs again on every
container restart, and an in-place edit would consume its own
placeholders, so the second run could no longer tell a correct
render from a failed one. The templates live outside the doc root
(`/etc/nginx/*.in`), so they are never served.

### It fails fast

The rendered `nginx.conf` must contain no `__PLACEHOLDER__` at all;
if one survives, the script exits non-zero and the pod never serves
traffic. A stray placeholder in a CSP is not a cosmetic problem —
it is not a valid source expression, and it invalidates the
directive it sits in.

`index.html` is the exception: `__AUTH_ORIGIN__` and
`__COOKIE_DOMAIN__` are allowed to survive there, because that is
precisely how "the operator did not set this" reaches the app.
Anything else surviving is a placeholder someone added to a
template without wiring it into the script, and is fatal.

Runtime config trades a build-time failure for a runtime failure;
this check is what buys that trade back.

### What is still baked

Only `.csp-script-hash` — the sha256 of the inlined theme-init
script, emitted by `vite.config.ts` during the build. That is a
property of the bundle, not of the deployment, so it belongs in
the image.

---

## Doing it through the Rancher UI

The manifests above are the source of truth; these are the
equivalent clicks if you're working in the Rancher cluster
explorer.

1. **Deployments → Create.** Container image
   `ghcr.io/kbase/next-gen-ui:<tag>`. Add a named port `http` /
   container port `8080` / protocol TCP; set "Service Type" to
   ClusterIP so Rancher creates the Service for you.
2. **Health Check tab.** Readiness and liveness both HTTP GET on
   path `/healthz`, port `8080`.
3. **Security Context tab.** Run as user `101`, drop all
   capabilities, disallow privilege escalation.
4. **Registry secret**, if the image is private: create an
   `imagePullSecret` for `ghcr.io` in the namespace first and
   select it on the workload.
5. **Service Discovery → Ingresses → Create.** One rule: your
   hostname, path `/`, path type **Prefix**, target the service
   on port 80. Leave the annotations section empty apart from TLS
   / cert-manager. Rancher's ingress form defaults the path type
   to "Exact" in some versions — Exact matches only `/` and
   every deep link 404s at the edge. Check it.
6. **Certificates.** Either a cert-manager `cluster-issuer`
   annotation or a pre-created TLS secret referenced from the
   Ingress's TLS section.

---

## Verifying a deploy

Run these against the public hostname, not the Service.

```bash
# 1. Health endpoint answers 204 through the ingress.
curl -sS -o /dev/null -w '%{http_code}\n' https://<host>/healthz

# 2. A deep link returns 200 and HTML directly — no redirect. This
#    is the single check that proves the router works on reload,
#    and the one that catches the try_files/directory collision.
#    A 301 here means $uri/ is matching a directory again.
curl -sS -o /dev/null -w '%{http_code} %{content_type} %{redirect_url}\n' \
  https://<host>/portals                                   # 200 text/html
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
  https://<host>/portals/                                  # 200 text/html

# 3. A route that does not exist ALSO returns 200 + HTML. That is
#    correct for an SPA: the router renders its own not-found.
curl -sS -o /dev/null -w '%{http_code}\n' https://<host>/no-such-route

# 4. index.html is not cached, assets are.
curl -sSI https://<host>/ | grep -i cache-control          # no-cache
curl -sSI https://<host>/assets/<file>.js | grep -i cache-control  # immutable

# 5. Exactly one CSP header, naming the right auth origin, and
#    carrying a script-src hash (no unsubstituted __PLACEHOLDER__).
curl -sSI https://<host>/ | grep -ci content-security-policy   # 1
curl -sSI https://<host>/ | grep -i content-security-policy

# 6. Card thumbnails resolve (they sit outside the /portals prefix).
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
  https://<host>/portal-thumbs/enigma-strata.svg           # 200 image/svg+xml
```

Then, in a browser: load `/portals` directly (not by clicking
through from `/`), reload it, and complete a full ORCID sign-in
so the `/login/continue?state=…` callback is exercised end to
end. **Check the console is clean while you do it** — CSP
violations are invisible in `curl` and in dev (there is no CSP on
the dev server), so the console is the only place a blocked
inline script or font shows up. Those three are what a misconfigured Ingress breaks, and
none of them break during ordinary click-through navigation —
which is why an ingress problem here tends to be reported as
"it works until you refresh".

---

## Troubleshooting

| Symptom                                                         | Likely cause                                                                                                            |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Click-through navigation works, refresh 404s                    | Ingress path type is `Exact`, or routes are enumerated in the Ingress. Use one `/` `Prefix` rule.                       |
| Blank page, console 404s on `/assets/index-<hash>.js`           | App is being served under a path prefix, or a cached `index.html` outlived its build.                                   |
| Blank page only for returning users, fine in a private window   | `index.html` cached at the edge. It must be `no-cache` all the way through.                                             |
| Route fails on hover, before any click                          | `defaultPreload: 'intent'` prefetching a chunk from a stale `index.html`, or asset skew mid-rollout.                    |
| Fonts blocked, or the login form POST blocked, by CSP           | A second CSP header added at the edge; browsers intersect all of them.                                                  |
| A route 301s to itself with a trailing slash, then 403s         | `try_files` has `$uri/` back, and a directory in `public/` shadows the route. Drop `$uri/`.                             |
| A redirect sends the browser to port 8080                       | `absolute_redirect off;` is missing; nginx built the URL from its own listen port.                                      |
| A public route bounces to `/login`, but only for some users     | They are replaying a cached 301 to the trailing-slash form. `isPublic()` normalises it; check the fix is deployed.      |
| Console: "Executing inline script violates ... 'default-src'"   | `script-src` hash is stale or unsubstituted. Emitted to `.csp-script-hash` at build; check the entrypoint rendered it.  |
| Console: font blocked from a `data:` URI                        | `font-src` lost `data:`. Vite inlines font subsets under 4 KB.                                                          |
| Login redirects back and immediately bounces to `/login`        | Cookie didn't land: check the host against `.kbase.us`, and that the site is served over https.                         |
| Login works, but signing in elsewhere on kbase.us doesn't carry | Hostname is outside `kbase.us`, so the cookie has no `Domain`. See [Hostname choice](#hostname-choice-is-not-cosmetic). |
| Requests to the auth service blocked by CSP `connect-src`       | `AUTH_ORIGIN` on the workload does not match the origin the app calls. Fix the env var and restart; no rebuild needed.  |
| Pod CrashLoopBackOff after enabling `readOnlyRootFilesystem`    | Missing `emptyDir` on `/tmp` or `/var/cache/nginx`.                                                                     |

---

## See also

- [`README.md`](./README.md) — build, scripts, env vars, the
  Dockerfile stage layout, and what `nginx.conf` sets.
- [`src/api/auth/README.md`](./src/api/auth/README.md) — the
  login flow, cookie attributes, and why `VITE_AUTH_ORIGIN` has
  to be the canonical `kbase.us`.
