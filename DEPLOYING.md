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
process, no API layer of our own. Every backend call the browser
makes goes directly to `VITE_AUTH_ORIGIN`
(`https://kbase.us/services/auth/...`), not through this pod.

Two consequences that shape the whole deployment:

- **Configuration is baked at image build time.** Vite inlines
  `import.meta.env.VITE_*` into the bundle, and the Dockerfile
  substitutes the same value into the nginx CSP. Environment
  variables set on the Rancher workload reach nginx, not the
  bundle, and nothing in `nginx.conf` reads them. Changing
  `VITE_AUTH_ORIGIN` means rebuilding the image, not editing the
  Deployment. See [Per-environment builds](#per-environment-builds).
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

The gallery branch makes the hazard concrete: `/portals` is a
route rendered by the SPA, while `/portals/enigma-strata.svg` and
its siblings are real files in `public/portals/`. The same prefix
is both an application route and a static asset directory, and
nginx resolves the difference per request via `try_files`. Any
edge rule that special-cases part of that prefix will split them.

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

## Per-environment builds

Because config is inlined at build time, **each environment needs
its own image build**, not its own Deployment env vars.

```bash
# production
docker build \
  --build-arg VITE_AUTH_ORIGIN=https://kbase.us \
  -t ghcr.io/kbase/next-gen-ui:0.1.0 .

# CI / staging
docker build \
  --build-arg VITE_AUTH_ORIGIN=https://ci.kbase.us \
  -t ghcr.io/kbase/next-gen-ui:0.1.0-ci .
```

`VITE_AUTH_ORIGIN` is one value used twice: Vite inlines it into
the bundle, and the `conf` stage substitutes it into the CSP's
`connect-src` and `form-action`. That coupling is the point — a
bundle calling one origin while the CSP allows another produces a
blocked request with a confusing console message. Pass
`--build-arg IDP_ORIGINS="https://orcid.org https://other.idp"`
if a build ever needs more than ORCID in `form-action`.

`.github/workflows/docker.yml` currently builds with the default
`VITE_AUTH_ORIGIN=https://kbase.us`. A CI-pointed image is a
manual build (or a workflow change) until that's parameterised.

If someone adds a `VITE_*` value to the Rancher workload's
environment tab expecting it to take effect: it won't, and there
will be no error. The bundle was already written.

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

# 2. A deep link returns 200 and HTML, not a 404 — this is the
#    single check that proves the router will work on reload.
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' https://<host>/portals

# 3. A route that does not exist ALSO returns 200 + HTML. That is
#    correct for an SPA: the router renders its own not-found.
curl -sS -o /dev/null -w '%{http_code}\n' https://<host>/no-such-route

# 4. index.html is not cached, assets are.
curl -sSI https://<host>/ | grep -i cache-control          # no-cache
curl -sSI https://<host>/assets/<file>.js | grep -i cache-control  # immutable

# 5. Exactly one CSP header, and it names the right auth origin.
curl -sSI https://<host>/ | grep -ci content-security-policy   # 1
curl -sSI https://<host>/ | grep -i content-security-policy

# 6. The static assets that share the /portals prefix still resolve.
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
  https://<host>/portals/enigma-strata.svg                 # 200 image/svg+xml
```

Then, in a browser: load `/portals` directly (not by clicking
through from `/`), reload it, and complete a full ORCID sign-in
so the `/login/continue?state=…` callback is exercised end to
end. Those three are what a misconfigured Ingress breaks, and
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
| Login redirects back and immediately bounces to `/login`        | Cookie didn't land: check the host against `.kbase.us`, and that the site is served over https.                         |
| Login works, but signing in elsewhere on kbase.us doesn't carry | Hostname is outside `kbase.us`, so the cookie has no `Domain`. See [Hostname choice](#hostname-choice-is-not-cosmetic). |
| Requests to the auth service blocked by CSP `connect-src`       | Image built with a different `VITE_AUTH_ORIGIN` than the environment expects. Rebuild; env vars won't fix it.           |
| Pod CrashLoopBackOff after enabling `readOnlyRootFilesystem`    | Missing `emptyDir` on `/tmp` or `/var/cache/nginx`.                                                                     |

---

## See also

- [`README.md`](./README.md) — build, scripts, env vars, the
  Dockerfile stage layout, and what `nginx.conf` sets.
- [`src/api/auth/README.md`](./src/api/auth/README.md) — the
  login flow, cookie attributes, and why `VITE_AUTH_ORIGIN` has
  to be the canonical `kbase.us`.
