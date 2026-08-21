# Deploying

A static single-page app served by nginx. It is configured when the
container starts, not when the image is built, so one image runs in
every environment.

This covers what is specific to this app. Everything else is a normal
Rancher2 workload.

---

## Image

`ghcr.io/kbase/next-gen-ui`, built by `.github/workflows/docker.yml`
for `linux/amd64` and `linux/arm64`.

| Tag                    | From                                |
| ---------------------- | ----------------------------------- |
| `x.y.z`, `x.y`, `x`    | GitHub Release                      |
| `latest`               | GitHub Release, non-prerelease only |
| `pr-<n>`, `prerelease` | PR from this repo                   |
| `sha-<short>`          | Any pushed build                    |

There are no build arguments. Deploy by immutable tag.

## Container

|                     |                                                                          |
| ------------------- | ------------------------------------------------------------------------ |
| Port                | `8080`                                                                   |
| User                | `101`, non-root                                                          |
| Health              | `GET /healthz` → `204`                                                   |
| Writable at runtime | `/etc/nginx/conf.d`, `/usr/share/nginx/html`, `/tmp`, `/var/cache/nginx` |

`readOnlyRootFilesystem` is not supported. The entrypoint renders
`default.conf` and `index.html` on every start, and `index.html` sits
in the document root, so an `emptyDir` there would replace the app.

## Configuration

Set these on the workload. Rendered at container start; no rebuild is
involved. For each one, unset and empty mean different things.

| Var             | Unset                              | `''`                       |
| --------------- | ---------------------------------- | -------------------------- |
| `AUTH_ORIGIN`   | no auth service in this deployment | same-origin                |
| `COOKIE_DOMAIN` | derived from the current host      | `Domain` attribute omitted |
| `IDP_ORIGINS`   | `https://orcid.org`                | —                          |

```yaml
env:
  - name: AUTH_ORIGIN
    value: https://kbase.us
  - name: COOKIE_DOMAIN
    value: .kbase.us
```

Leaving `AUTH_ORIGIN` unset is supported. The public routes work and
sign-in reports that it is unavailable. This is the state before an
auth route exists.

The container exits non-zero if a template placeholder is left
unsubstituted, so a misconfigured pod does not serve traffic.

## Ingress

**Serve the app at the root of a hostname.** The bundle requests its
own assets at absolute paths (`/assets/…`), so a path prefix does not
work, with or without `rewrite-target`.

**Route every path to the service.** The SPA fallback is in the pod's
nginx config. Listing individual routes at the edge means a route
added later returns 404 before it reaches the pod.

**Except `/portals/<slug>`, which is a different backend.** The portal
server serves those. This app serves `/portals` itself — the gallery
listing. The rule for `/portals/` must be matched before the catch-all,
or the gallery is unreachable.

**Do not cache `index.html`.** The pod sets `no-cache` on it and
`immutable` on `/assets/*`, which are content-hashed. A cached
`index.html` refers to asset filenames that a later image does not
contain.

**Do not set security headers at the edge.** The pod sets
`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`
and `X-Frame-Options`. A second CSP header does not replace the first;
browsers apply all of them, so the result is more restrictive than
either.

TLS is required: the session cookie is only set over HTTPS, and ORCID
will not redirect to a plaintext callback.

Use a hostname under `kbase.us` if the session should be shared with
the legacy UI and narratives. On any other hostname the cookie is
scoped to that host unless `COOKIE_DOMAIN` is set explicitly.

## Verify

```bash
# 200, no redirect. A 301 here means the /portals rule is wrong.
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://<host>/portals

# 200 and text/html: the SPA fallback is reaching the pod.
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' https://<host>/no-such-route

# no-cache on the document, immutable on assets.
curl -sSI https://<host>/ | grep -i cache-control

# Exactly one CSP header, naming the right auth origin.
curl -sSI https://<host>/ | grep -ci content-security-policy
```

Then load `/portals` directly in a browser and check the console is
clean. CSP violations do not appear in `curl` output, and there is no
CSP on the dev server, so the console is the only place they show.

## If something is wrong

| Symptom                                       | Cause                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| Navigation works, reload 404s                 | The edge is not routing every path to the service.                                     |
| `/portals` 301s, then 403s                    | A `/portals/` rule is matching before the gallery route.                               |
| Blank page, 404s on `/assets/…`               | Served under a path prefix, or a cached `index.html`.                                  |
| Fonts or form posts blocked by CSP            | A second CSP header added at the edge.                                                 |
| Auth requests blocked by CSP                  | `AUTH_ORIGIN` does not match the origin the app calls. Restart; no rebuild.            |
| Sign-in works, but not shared across kbase.us | Hostname is outside `kbase.us`, so the cookie has no `Domain`.                         |
| CrashLoopBackOff on start                     | Check the container log: the entrypoint names the placeholder it could not substitute. |

---

Build and environment variable details are in
[`README.md`](./README.md).
