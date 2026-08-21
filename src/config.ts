// Deploy-time configuration.
//
// Values are rendered into index.html as `<meta name="config:*">` when the
// container starts (docker-entrypoint.d/05-render-config.sh), NOT inlined
// into the bundle at build time. One image therefore runs in every
// environment and is promoted by tag rather than rebuilt per environment.
//
// Meta tags rather than an inline `<script>` because the CSP blocks inline
// script unless it is named by hash, and a hash over per-environment values
// would have to be recomputed inside the boot script. Meta content is not
// script, so CSP never enters into it -- and unlike a fetched config.json
// the values are available synchronously, so AUTH_ORIGIN stays a plain
// const and the auth client does not have to become async.
//
// In dev and `npm run preview` no entrypoint has run, so the placeholders
// are still in place and this falls back to import.meta.env.

import { z } from 'zod';

const ConfigSchema = z.object({
  // Three distinct states:
  //   'https://…' -> that auth service
  //   ''          -> same-origin; the client emits relative paths and
  //                  something in front (the Vite dev proxy today) forwards
  //   null        -> no auth service in this deployment. Public routes must
  //                  keep working; sign-in reports itself as unavailable
  //                  rather than posting into the void.
  authOrigin: z.string().nullable(),
  // undefined -> derive from the current host; '' -> omit the Domain
  // attribute entirely. See api/auth/cookie.ts.
  cookieDomain: z.string().optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

const PLACEHOLDER = /^__[A-Z_]+__$/;

/** Whether the build injected config tags at all. Only builds have them. */
function hasMeta(name: string): boolean {
  return document.querySelector(`meta[name="config:${name}"]`) !== null;
}

/**
 * Reads one `<meta name="config:NAME">`. Returns undefined when the tag is
 * absent (dev build) or still holds its `__PLACEHOLDER__` — the entrypoint
 * leaves the placeholder in place for a variable the operator did not set,
 * so "not configured" survives as a distinct state from "set to empty".
 * An empty `content` is a real value.
 */
function readMeta(name: string): string | undefined {
  const content = document.querySelector(`meta[name="config:${name}"]`)?.getAttribute('content');
  if (content == null || PLACEHOLDER.test(content)) return undefined;
  return content;
}

/**
 * Absent tag  -> dev or `npm run preview`: use the build-time env, as before.
 * Placeholder -> a container started without AUTH_ORIGIN: no auth service.
 * Value       -> that value (including '' for same-origin).
 */
function resolveAuthOrigin(): string | null {
  const value = readMeta('auth-origin');
  if (value !== undefined) return value;
  if (hasMeta('auth-origin')) return null;
  return import.meta.env.VITE_AUTH_ORIGIN ?? 'https://kbase.us';
}

export const config: AppConfig = ConfigSchema.parse({
  authOrigin: resolveAuthOrigin(),
  cookieDomain: readMeta('cookie-domain') ?? import.meta.env.VITE_COOKIE_DOMAIN,
});

/**
 * False when this deployment has no auth service. Public routes must render
 * normally; anything that would talk to the auth service reports itself as
 * unavailable instead.
 */
export const authEnabled: boolean = config.authOrigin !== null;
