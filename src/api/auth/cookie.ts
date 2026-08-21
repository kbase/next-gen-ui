// kbase_session cookie storage. Owns the Domain attribute.
//
// XSS exposure trade: this cookie holds a session token and is set
// from JS, so it cannot be HttpOnly (only the auth service can mark
// it that way during its own redirect chain). Cross-subdomain SSO
// requires it readable from JS on every kbase subdomain.

import { config } from '../../config';

export const COOKIE_NAME = 'kbase_session';

// Cookies don't fire cross-tab events; localStorage does. We mirror
// the cookie write/clear into a tiny localStorage signal so other
// tabs receive a `storage` event and can invalidate their auth cache.
// The signal value is a timestamp, never the token itself.
export const AUTH_SIGNAL_KEY = 'kbase_session_signal';

// Token expiry mirror (unix-ms). Cookie Expires= isn't readable
// from JS; queries.ts's expiry watchdog reads this to schedule
// eviction and rearms it after page reload.
export const EXPIRY_KEY = 'kbase_session_expires_at';

// Cookie domain: unset → ".kbase.us" on kbase.us hosts, omitted
// elsewhere; explicit value → that value; empty string → omitted.
// Rendered into index.html at container start; falls back to
// VITE_COOKIE_DOMAIN in dev. See src/config.ts.
const DOMAIN_OVERRIDE = config.cookieDomain;

function effectiveDomain(): string | undefined {
  if (DOMAIN_OVERRIDE !== undefined) return DOMAIN_OVERRIDE || undefined;
  const host = window.location.hostname;
  if (host === 'kbase.us' || host.endsWith('.kbase.us')) return '.kbase.us';
  return undefined;
}

export function getToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(match[1]);
  } catch {
    // Stray `%` in the cookie value crashes decodeURIComponent. Treat
    // as corrupted and evict so the gate redirects to /login cleanly.
    clearToken();
    return null;
  }
  // `decodeURIComponent('')` returns `''`. Collapse to null so callers
  // can use `!token` semantics consistently.
  return decoded === '' ? null : decoded;
}

export function setToken(value: string, expiresAt: Date): void {
  // Defensive clamp: catches a future schema regression where
  // `expires` shifts from ms to seconds, which would resolve to ~1970
  // and make the cookie evict immediately with no breadcrumb.
  if (expiresAt.getTime() <= Date.now()) {
    throw new RangeError(
      `setToken: expiresAt (${expiresAt.toISOString()}) is in the past, likely a unit mismatch on token.expires`,
    );
  }
  const isHttps = window.location.protocol === 'https:';
  const domain = effectiveDomain();
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Path=/`,
    `Expires=${expiresAt.toUTCString()}`,
    `SameSite=Lax`,
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (isHttps) parts.push('Secure');
  document.cookie = parts.join('; ');
  writeExpiry(expiresAt.getTime());
  writeAuthSignal(`set:${Date.now()}`);
}

// Browsers consistently require the Domain attribute on cookie deletion
// to match the original write. It's not "in some cases", it's the
// rule. Keep effectiveDomain() / SameSite / Secure aligned with
// setToken so the eviction reaches the same cookie.
export function clearToken(): void {
  const isHttps = window.location.protocol === 'https:';
  const domain = effectiveDomain();
  const parts = [
    `${COOKIE_NAME}=`,
    `Path=/`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `SameSite=Lax`,
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (isHttps) parts.push('Secure');
  document.cookie = parts.join('; ');
  clearExpiry();
  // setItem (not removeItem): the storage event only fires on
  // removeItem when the key existed. setItem with a state-encoded
  // value fires reliably whether or not the key was previously set.
  writeAuthSignal(`cleared:${Date.now()}`);
}

export function getExpiry(): number | null {
  try {
    const v = localStorage.getItem(EXPIRY_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeExpiry(ms: number): void {
  try {
    localStorage.setItem(EXPIRY_KEY, String(ms));
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[auth] expiry mirror write failed:', err);
    }
  }
}

function clearExpiry(): void {
  try {
    localStorage.removeItem(EXPIRY_KEY);
  } catch {
    /* swallowed; clearToken already best-effort */
  }
}

function writeAuthSignal(value: string): void {
  try {
    localStorage.setItem(AUTH_SIGNAL_KEY, value);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[auth] cross-tab signal write failed:', err);
    }
  }
}
