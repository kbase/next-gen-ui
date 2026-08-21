// Deploy-time config, rendered into index.html as `<meta name="config:*">`
// at container start (docker-entrypoint.d/05-render-config.sh), not baked
// into the bundle. Meta rather than an inline script because the CSP would
// need a per-environment hash for the latter; meta is also synchronous, so
// AUTH_ORIGIN stays a plain const.

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

/** Only a build injects the tags at all. */
function hasMeta(name: string): boolean {
  return document.querySelector(`meta[name="config:${name}"]`) !== null;
}

/**
 * undefined when the tag is absent or still holds its `__PLACEHOLDER__`.
 * An empty `content` is a real value, not an absent one.
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

/** False when this deployment has no auth service. */
export const authEnabled: boolean = config.authOrigin !== null;
