# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.30-alpine

# --platform=$BUILDPLATFORM: the deps and build stages run on the runner's
# own architecture for every target. The bundle is architecture-independent,
# and Node under QEMU has crashed mid-`npm ci` (SIGILL) and left the build
# hanging; only the runtime stage is per-target, and it only copies files.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# No VITE_* build args: deploy config is rendered at container start, not
# baked into the bundle, so this image is environment-agnostic and gets
# promoted by tag rather than rebuilt per environment. See
# docker-entrypoint.d/05-render-config.sh and src/config.ts.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stock nginx rather than nginxinc/nginx-unprivileged, which has no 1.30.7
# build (the fix for CVE-2026-123007). The RUN makes the edits that image
# makes to stock nginx so the server runs as uid 101 (the image's `nginx`
# user): no `user` directive, pid and temp files under /tmp, and /etc/nginx
# and /var/cache/nginx writable, since the entrypoint renders conf.d/ there.
FROM nginx:${NGINX_VERSION} AS runtime
RUN sed -i -e '/^user /d' \
      -e 's,^pid .*,pid /tmp/nginx.pid;,' \
      -e '/^http {/a \    client_body_temp_path /tmp/client_temp;\n    proxy_temp_path /tmp/proxy_temp;\n    fastcgi_temp_path /tmp/fastcgi_temp;\n    uwsgi_temp_path /tmp/uwsgi_temp;\n    scgi_temp_path /tmp/scgi_temp;' \
      /etc/nginx/nginx.conf \
 && chown -R 101:0 /etc/nginx /var/cache/nginx \
 && chmod -R g+w /etc/nginx /var/cache/nginx
# Templates, not final files: the entrypoint renders both on every start.
# `__VAR__` placeholders rather than $VAR so substitution can't collide with
# nginx's own $-prefixed variables.
COPY nginx.conf /etc/nginx/default.conf.in
COPY --from=build /app/dist/index.html /etc/nginx/index.html.in
# Hash of the inlined theme-init script, emitted by vite.config.ts. A
# property of the bundle, so it is baked rather than passed in.
COPY --from=build /app/.csp-script-hash /etc/nginx/.csp-script-hash
COPY --chmod=0755 docker-entrypoint.d/05-render-config.sh /docker-entrypoint.d/
# --chown: the entrypoint runs as uid 101 and rewrites index.html in place.
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
