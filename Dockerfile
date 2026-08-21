# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27-alpine

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ARG VITE_AUTH_ORIGIN=https://kbase.us
ENV VITE_AUTH_ORIGIN=${VITE_AUTH_ORIGIN}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Substitute AUTH_ORIGIN / IDP_ORIGINS / SCRIPT_HASH into nginx.conf at build
# time (custom __VAR__ placeholders avoid colliding with $-prefixed nginx vars).
# Single source of truth: VITE_AUTH_ORIGIN matches the bundle's embedded
# value. IDP_ORIGINS is space-separated if a multi-IDP build ever needs it.
# SCRIPT_HASH comes from the build stage (vite.config.ts writes it) so the
# CSP always names the theme-init script that actually shipped.
FROM alpine:3 AS conf
ARG VITE_AUTH_ORIGIN=https://kbase.us
ARG IDP_ORIGINS=https://orcid.org
COPY nginx.conf /tmp/nginx.conf
COPY --from=build /app/.csp-script-hash /tmp/.csp-script-hash
RUN sed -e "s#__AUTH_ORIGIN__#${VITE_AUTH_ORIGIN}#g" \
        -e "s#__IDP_ORIGINS__#${IDP_ORIGINS}#g" \
        -e "s#__SCRIPT_HASH__#$(cat /tmp/.csp-script-hash)#g" \
        /tmp/nginx.conf > /tmp/default.conf && \
    grep -q "__" /tmp/default.conf && \
      { echo "nginx.conf still has unsubstituted __PLACEHOLDER__:"; \
        grep -o "__[A-Z_]*__" /tmp/default.conf; exit 1; } || true

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS runtime
COPY --from=conf /tmp/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
