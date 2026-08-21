// Deploy-time config, rendered into index.html as `<meta name="config:*">`
// at container start (docker-entrypoint.d/05-render-config.sh), not baked
// into the bundle. Meta rather than an inline script because the CSP would
// need a per-environment hash for the latter; meta is also synchronous, so
// AUTH_ORIGIN stays a plain const.

import { z } from 'zod';

const ConfigSchema = z.object({
  // null means this deployment has no auth service: public routes keep
  // working and sign-in reports itself unavailable. In dev an empty
  // VITE_AUTH_ORIGIN is still a value -- relative paths through the proxy.
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

/** undefined when the tag is absent, empty, or still a `__PLACEHOLDER__`. */
function readMeta(name: string): string | undefined {
  const content = document.querySelector(`meta[name="config:${name}"]`)?.getAttribute('content');
  if (!content || PLACEHOLDER.test(content)) return undefined;
  return content;
}

/**
 * No tag at all means a dev build, which falls back to the build-time env.
 * A container always has the tag: a value, or nothing, meaning no auth.
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
