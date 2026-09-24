// kbase_session cookie storage. Owns the Domain attribute.
//
// XSS exposure trade: this cookie holds a session token and is set
// from JS, so it cannot be HttpOnly (only the auth service can mark
// it that way during its own redirect chain). Cross-subdomain SSO
// requires it readable from JS on every kbase subdomain.

import { config } from '../../config';

export const COOKIE_NAME = 'kbase_session';

// Production kbase-ui scopes its kbase_session to .narrative.kbase.us, which
// other kbase.us hosts never receive; it and the Narrative also write this
// copy on .kbase.us. Read as a fallback, never written here.
export const BACKUP_COOKIE_NAME = 'kbase_session_backup';

// Cookies don't fire cross-tab events; localStorage does. We mirror
// the cookie write/clear into a tiny localStorage signal so other
// tabs receive a `storage` event and can invalidate their auth cache.
// The signal value is a timestamp, never the token itself.
export const AUTH_SIGNAL_KEY = 'kbase_session_signal';

// Token expiry mirror (unix-ms). Cookie Expires= isn't readable
// from JS; queries.ts's expiry watchdog reads this to schedule
// eviction and rearms it after page reload.
export const EXPIRY_KEY = 'kbase_session_expires_at';

// Host-only unless COOKIE_DOMAIN names a domain. kbase-ui and the Narrative
// each keep kbase_session on their own host; one on .kbase.us reaches them
// too, and they disagree on which of two same-named cookies they read.
// Rendered into index.html at container start; falls back to
// VITE_COOKIE_DOMAIN in dev. See src/config.ts.
const DOMAIN_OVERRIDE = config.cookieDomain;

function effectiveDomain(): string | undefined {
  return DOMAIN_OVERRIDE || undefined;
}

function onKbaseHost(): boolean {
  const host = window.location.hostname;
  return host === 'kbase.us' || host.endsWith('.kbase.us');
}

// Earlier builds wrote kbase_session on .kbase.us by default. Expire that
// copy whenever this app writes or clears its own, so it stops reaching
// other kbase.us hosts and stops shadowing the host-only cookie here.
function expireSharedCopy(): void {
  const domain = effectiveDomain()?.replace(/^\./, '');
  if (!onKbaseHost() || domain === 'kbase.us') return;
  const parts = [
    `${COOKIE_NAME}=`,
    `Path=/`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    'Domain=.kbase.us',
  ];
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}

/**
 * Moves a session held only in the old .kbase.us copy onto this host, using
 * the expiry mirrored at sign-in. Run once at boot. document.cookie does not
 * say which domain a cookie belongs to, so the copy is expired and the token
 * rewritten if nothing host-only remains.
 */
export function migrateSharedCookie(): void {
  if (!onKbaseHost() || effectiveDomain()?.replace(/^\./, '') === 'kbase.us') return;
  const token = readCookie(COOKIE_NAME, () => {});
  if (!token) return;
  expireSharedCopy();
  if (readCookie(COOKIE_NAME, () => {}) !== null) return;
  const expiry = getExpiry();
  if (expiry !== null && expiry > Date.now()) setToken(token, new Date(expiry));
}

/** kbase_session, else kbase_session_backup. */
export function getToken(): string | null {
  return readCookie(COOKIE_NAME, clearToken) ?? readCookie(BACKUP_COOKIE_NAME, clearBackupToken);
}

function readCookie(name: string, evict: () => void): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(match[1]);
  } catch {
    // Stray `%` in the cookie value crashes decodeURIComponent. Treat
    // as corrupted and evict so the gate redirects to /login cleanly.
    evict();
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
  expireSharedCopy();
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
  expireSharedCopy();
  clearExpiry();
  // setItem (not removeItem): the storage event only fires on
  // removeItem when the key existed. setItem with a state-encoded
  // value fires reliably whether or not the key was previously set.
  writeAuthSignal(`cleared:${Date.now()}`);
}

/**
 * Deletes kbase_session_backup. Only for a token that is dead everywhere
 * (revoked at sign-out, or rejected by /me): the backup is shared with every
 * kbase.us site, so deleting a live one signs the user out of all of them.
 */
export function clearBackupToken(): void {
  const parts = [`${BACKUP_COOKIE_NAME}=`, `Path=/`, `Expires=Thu, 01 Jan 1970 00:00:00 GMT`];
  if (onKbaseHost()) parts.push('Domain=.kbase.us');
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
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
