#!/bin/sh
# Renders deploy config into the nginx conf and into index.html, every time
# the container starts. Run by the nginx image's own entrypoint, which execs
# everything in /docker-entrypoint.d before starting nginx.
#
# One image serves every environment: nothing here is baked at build time
# except the theme-init script hash, which is a property of the bundle rather
# than of the deployment.
#
# Both files are rendered from pristine templates rather than edited in
# place. This entrypoint runs again on every container restart, and an
# in-place edit would consume its own placeholders -- after which the
# leftover-placeholder check below could no longer tell a correct render
# from a failed one.
set -eu

CONF_IN=/etc/nginx/default.conf.in
CONF_OUT=/etc/nginx/conf.d/default.conf
HTML_IN=/etc/nginx/index.html.in
HTML_OUT=/usr/share/nginx/html/index.html
HASH_FILE=/etc/nginx/.csp-script-hash

# AUTH_ORIGIN may legitimately be empty (same-origin: the client emits
# relative paths and something in front forwards them), so require it to be
# *set* rather than non-empty. Unset is a misconfigured deployment, and
# failing here is much cheaper than serving an app that quietly talks to the
# wrong auth service.
if [ -z "${AUTH_ORIGIN+x}" ]; then
  echo "05-render-config: AUTH_ORIGIN is not set." >&2
  echo "  Set it on the workload, e.g. AUTH_ORIGIN=https://kbase.us" >&2
  echo "  (empty is allowed and means same-origin; unset is not)." >&2
  exit 1
fi

# Optional, with the same defaults the app assumed when config was baked in.
IDP_ORIGINS="${IDP_ORIGINS:-https://orcid.org}"
# Unset COOKIE_DOMAIN means "derive from the current host" -- see
# src/api/auth/cookie.ts. The placeholder is left in place for that case so
# src/config.ts reads it as absent rather than as an empty override, which
# would mean something different (omit the Domain attribute).
COOKIE_DOMAIN_VALUE="${COOKIE_DOMAIN-__COOKIE_DOMAIN__}"

SCRIPT_HASH="$(cat "$HASH_FILE")"

# `#` as the sed delimiter: these values are URLs.
render() {
  sed -e "s#__AUTH_ORIGIN__#${AUTH_ORIGIN}#g" \
      -e "s#__IDP_ORIGINS__#${IDP_ORIGINS}#g" \
      -e "s#__COOKIE_DOMAIN__#${COOKIE_DOMAIN_VALUE}#g" \
      -e "s#__SCRIPT_HASH__#${SCRIPT_HASH}#g" \
      "$1" > "$2"
}

render "$CONF_IN" "$CONF_OUT"
render "$HTML_IN" "$HTML_OUT"

# Anything still bracketed means a placeholder was added without being
# wired up here. Fail loudly rather than shipping a literal __VAR__ into
# a CSP or a meta tag. __COOKIE_DOMAIN__ is the one deliberate survivor.
leftover="$(grep -oh '__[A-Z_]*__' "$CONF_OUT" "$HTML_OUT" | grep -v '^__COOKIE_DOMAIN__$' || true)"
if [ -n "$leftover" ]; then
  echo "05-render-config: unsubstituted placeholders remain:" >&2
  echo "$leftover" | sort -u >&2
  exit 1
fi

echo "05-render-config: AUTH_ORIGIN=${AUTH_ORIGIN:-(same-origin)} IDP_ORIGINS=${IDP_ORIGINS}"
