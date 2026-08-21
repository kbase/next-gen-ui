# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27-alpine

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# No VITE_* build args: deploy config is rendered at container start, not
# baked into the bundle, so this image is environment-agnostic and gets
# promoted by tag rather than rebuilt per environment. See
# docker-entrypoint.d/05-render-config.sh and src/config.ts.
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS runtime
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

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
