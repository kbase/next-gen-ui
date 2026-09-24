// kbase_session cookie storage. Owns the Domain attribute.
//
// XSS exposure trade: this cookie holds a session token and is set
// from JS, so it cannot be HttpOnly (only the auth service can mark
// it that way during its own redirect chain). JS also reads it, to
// send the token as an Authorization header.

import { config } from '../../config';

export const COOKIE_NAME = 'kbase_session';

// Production kbase-ui keeps its kbase_session on .narrative.kbase.us, which
// no other host receives. It and the Narrative also write the token to this
// cookie on .kbase.us. Read as a fallback; never written here.
export const BACKUP_COOKIE_NAME = config.backupCookieName;

// Cookies don't fire cross-tab events; localStorage does. We mirror
// the cookie write/clear into a tiny localStorage signal so other
// tabs receive a `storage` event and can invalidate their auth cache.
// The signal value is a timestamp, never the token itself.
export const AUTH_SIGNAL_KEY = 'kbase_session_signal';

// Token expiry mirror (unix-ms). Cookie Expires= isn't readable
// from JS; queries.ts's expiry watchdog reads this to schedule
// eviction and rearms it after page reload.
export const EXPIRY_KEY = 'kbase_session_expires_at';

// A kbase_session on .kbase.us would reach kbase-ui and the Narrative as a
// second cookie of that name, and they read different ones of the pair.
// Rendered into index.html at container start; falls back to
// VITE_COOKIE_DOMAIN in dev. See src/config.ts.
const DOMAIN_OVERRIDE = config.cookieDomain;

function effectiveDomain(): string | undefined {
  return DOMAIN_OVERRIDE || undefined;
}

// Deletes must name the domain the backup was written on: the parent domain
// of this host (gen2.kbase.us -> .kbase.us).
function backupDomain(): string | undefined {
  const labels = window.location.hostname.split('.');
  return labels.length >= 2 ? `.${labels.slice(-2).join('.')}` : undefined;
}

/** Deletes kbase_session_backup only when it holds `token`. */
export function clearBackupTokenIf(token: string): void {
  if (readCookie(BACKUP_COOKIE_NAME, clearBackupToken) === token) clearBackupToken();
}

/** kbase_session, else kbase_session_backup. */
export function getToken(): string | null {
  let evicted = false;
  const primary = readCookie(COOKIE_NAME, () => {
    // Other tabs are told only if no backup takes over below.
    clearToken({ notify: false });
    evicted = true;
  });
  if (primary !== null) return primary;
  const backup = readCookie(BACKUP_COOKIE_NAME, clearBackupToken);
  if (evicted && backup === null) notifyOtherTabs('cleared');
  return backup;
}

function readCookie(name: string, evict: () => void): string | null {
  // BACKUP_COOKIE_NAME is a runtime setting.
  const literal = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${literal}=([^;]*)`));
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
  document.cookie = parts.join('; ');
  writeExpiry(expiresAt.getTime());
  writeAuthSignal(`set:${Date.now()}`);
}

// Browsers consistently require the Domain attribute on cookie deletion
// to match the original write. It's not "in some cases", it's the
// rule. Keep effectiveDomain() / SameSite / Secure aligned with
// setToken so the eviction reaches the same cookie.
export function clearToken({ notify = true }: { notify?: boolean } = {}): void {
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
  if (notify) writeAuthSignal(`cleared:${Date.now()}`);
}

/** Tells other tabs the session changed or ended without writing a cookie. */
export function notifyOtherTabs(state: 'set' | 'cleared'): void {
  writeAuthSignal(`${state}:${Date.now()}`);
}

/**
 * Deletes kbase_session_backup. Only for a token that is dead everywhere
 * (revoked at sign-out, or rejected by /me): the backup is shared with every
 * kbase.us site, so deleting a live one signs the user out of all of them.
 */
export function clearBackupToken(): void {
  const parts = [`${BACKUP_COOKIE_NAME}=`, `Path=/`, `Expires=Thu, 01 Jan 1970 00:00:00 GMT`];
  const domain = backupDomain();
  if (domain) parts.push(`Domain=${domain}`);
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
