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

# Optional, with the same defaults the app assumed when config was baked in.
IDP_ORIGINS="${IDP_ORIGINS:-https://orcid.org}"

# Unset and empty mean the same thing: not configured. The placeholder is
# left in place and src/config.ts reads a surviving __PLACEHOLDER__ as
# absent. For AUTH_ORIGIN that means no auth service, which is a supported
# deployment rather than an error.
AUTH_ORIGIN_META="${AUTH_ORIGIN:-__AUTH_ORIGIN__}"
COOKIE_DOMAIN_VALUE="${COOKIE_DOMAIN:-__COOKIE_DOMAIN__}"

# A literal __AUTH_ORIGIN__ is not a valid CSP source expression, so with no
# auth service the directive collapses to 'self'. The templates write
# `'self'__AUTH_ORIGIN__` with no space and the space is carried by the
# value, so an absent origin leaves `'self';` rather than `'self' ;`.
if [ -n "${AUTH_ORIGIN:-}" ]; then
  AUTH_ORIGIN_CSP=" ${AUTH_ORIGIN}"
else
  AUTH_ORIGIN_CSP=""
fi

SCRIPT_HASH="$(cat "$HASH_FILE")"

# `#` is the sed delimiter because these values are URLs and contain `/`.
# An unescaped `&` in a replacement would insert the matched placeholder
# instead of the value, which the leftover check below cannot detect.
esc() {
  printf '%s' "$1" | sed -e 's#[&\\]#\\&#g'
}

render() {
  sed -e "s#__AUTH_ORIGIN__#$(esc "$1")#g" \
      -e "s#__IDP_ORIGINS__#$(esc "$IDP_ORIGINS")#g" \
      -e "s#__COOKIE_DOMAIN__#$(esc "$COOKIE_DOMAIN_VALUE")#g" \
      -e "s#__SCRIPT_HASH__#$(esc "$SCRIPT_HASH")#g" \
      "$2" > "$3"
}

render "$AUTH_ORIGIN_CSP" "$CONF_IN" "$CONF_OUT"
render "$AUTH_ORIGIN_META" "$HTML_IN" "$HTML_OUT"

# The nginx conf must be fully substituted -- a stray __VAR__ in a CSP is a
# broken policy. index.html may keep the two "not configured" markers above,
# which the app reads deliberately; anything else there is a placeholder
# someone added to a template without wiring it up here.
conf_leftover="$(grep -oh '__[A-Z_]*__' "$CONF_OUT" || true)"
html_leftover="$(grep -oh '__[A-Z_]*__' "$HTML_OUT" \
  | grep -vE '^(__AUTH_ORIGIN__|__COOKIE_DOMAIN__)$' || true)"
leftover="$(printf '%s\n%s' "$conf_leftover" "$html_leftover" | grep -v '^$' || true)"
if [ -n "$leftover" ]; then
  echo "05-render-config: unsubstituted placeholders remain:" >&2
  echo "$leftover" | sort -u >&2
  exit 1
fi

if [ -z "${AUTH_ORIGIN:-}" ]; then
  echo "05-render-config: no AUTH_ORIGIN -- serving with no auth service." \
       "Public routes work; sign-in reports itself unavailable."
else
  echo "05-render-config: AUTH_ORIGIN=${AUTH_ORIGIN} IDP_ORIGINS=${IDP_ORIGINS}"
fi
