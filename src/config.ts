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
  // '' is meaningful: the client emits relative paths and something
  // same-origin (the Vite dev proxy today) forwards them.
  authOrigin: z.string(),
  // undefined -> derive from the current host; '' -> omit the Domain
  // attribute entirely. See api/auth/cookie.ts.
  cookieDomain: z.string().optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

const PLACEHOLDER = /^__[A-Z_]+__$/;

/**
 * Reads one `<meta name="config:NAME">`. Returns undefined when the tag is
 * absent (dev build) or still holds its `__PLACEHOLDER__` (`npm run
 * preview`, or an image whose entrypoint did not run), so callers fall
 * through to the build-time env. An empty `content` is a real value.
 */
function readMeta(name: string): string | undefined {
  const content = document.querySelector(`meta[name="config:${name}"]`)?.getAttribute('content');
  if (content == null || PLACEHOLDER.test(content)) return undefined;
  return content;
}

export const config: AppConfig = ConfigSchema.parse({
  authOrigin: readMeta('auth-origin') ?? import.meta.env.VITE_AUTH_ORIGIN ?? 'https://kbase.us',
  cookieDomain: readMeta('cookie-domain') ?? import.meta.env.VITE_COOKIE_DOMAIN,
});
