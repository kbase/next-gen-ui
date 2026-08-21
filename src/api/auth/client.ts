// Authorization header carries the raw token (no `Bearer` scheme;
// auth service rejects `Bearer ...` with 401). `credentials: 'include'`
// everywhere, because kbase auth reflects ACAC: true for kbase.us-origin
// requests and the cookie-auth endpoints (login/choice, login/pick)
// require it.

import {
  AllSessionsSchema,
  LoginChoiceSchema,
  LoginPickInputSchema,
  LoginPickResultSchema,
  MeSchema,
  MeUpdateSchema,
  TokenInfoSchema,
  type AllSessions,
  type LoginChoice,
  type LoginPickInput,
  type LoginPickResult,
  type Me,
  type MeUpdate,
  type TokenInfo,
} from './schemas';
import { authEnabled, config } from '../../config';

// Empty string in dev is intentional: client emits relative paths
// and the Vite dev proxy forwards to VITE_DEV_AUTH_PROXY. In a
// container this comes from the rendered meta tag, not the bundle.
export const AUTH_ORIGIN: string = config.authOrigin ?? '';

/**
 * False when no auth service is configured for this deployment. Public
 * routes still render; sign-in reports itself as unavailable. Re-exported
 * from config so callers have one auth-facing import.
 */
export const AUTH_ENABLED = authEnabled;

if (import.meta.env.DEV && import.meta.env.VITE_AUTH_ORIGIN === undefined) {
  console.warn(
    '[auth] VITE_AUTH_ORIGIN is unset; falling back to https://kbase.us. ' +
      'Set it in .env.development.local for non-prod testing.',
  );
}

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

interface CallOpts {
  signal?: AbortSignal;
}

// 401 interceptor for bearer-auth endpoints only. Cookie-auth
// callers (getLoginChoice, postLoginPick) bypass: a 401 from them
// means "OAuth in-process cookie expired", not "session is dead."
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(fn: (() => void) | null): void {
  onAuthFailure = fn;
}

async function bearerFetch(input: string, init: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) onAuthFailure?.();
  return res;
}

// Auth service surfaces errors as `{ error: { apperror, message, ... } }`.
// Prefer apperror (terse), fall back to message.
async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { apperror?: string; message?: string } };
    const detail = body?.error?.apperror ?? body?.error?.message;
    if (typeof detail === 'string' && detail.length > 0) return detail;
  } catch {
    /* response body not JSON */
  }
  return '';
}

function apiFailure(label: string, res: Response, detail: string): AuthApiError {
  return new AuthApiError(
    res.status,
    `${label} failed: ${res.status}${detail ? `: ${detail}` : ''}`,
  );
}

export async function validateToken(token: string | null, opts: CallOpts = {}): Promise<Me | null> {
  // No auth service: nobody is signed in, and a stale cookie must not
  // provoke a request at a URL that does not exist. Same shape as an
  // unrecognised token, so every caller already handles it.
  if (!AUTH_ENABLED) return null;
  if (!token) return null;
  const res = await bearerFetch(`${AUTH_ORIGIN}/services/auth/api/V2/me`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: token },
    signal: opts.signal,
  });
  if (res.status === 401) return null;
  if (!res.ok) throw apiFailure('validateToken', res, await readApiErrorMessage(res));
  return MeSchema.parse(await res.json());
}

// PUT /services/auth/me. Note the URL is /services/auth/me, NOT
// /api/V2/me. The GET sibling lives under /api/V2; the PUT does not.
export async function setMe(token: string, update: MeUpdate, opts: CallOpts = {}): Promise<void> {
  const body = MeUpdateSchema.parse(update);
  const res = await bearerFetch(`${AUTH_ORIGIN}/services/auth/me`, {
    method: 'PUT',
    credentials: 'include',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    throw apiFailure('setMe', res, await readApiErrorMessage(res));
  }
}

export async function getTokenInfo(token: string, opts: CallOpts = {}): Promise<TokenInfo> {
  const res = await bearerFetch(`${AUTH_ORIGIN}/services/auth/api/V2/token`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: token },
    signal: opts.signal,
  });
  if (!res.ok) throw apiFailure('getTokenInfo', res, await readApiErrorMessage(res));
  return TokenInfoSchema.parse(await res.json());
}

// Auth via the in-process cookie set by the auth service during the
// OAuth redirect chain. No Authorization header.
export async function getLoginChoice(opts: CallOpts = {}): Promise<LoginChoice> {
  const res = await fetch(`${AUTH_ORIGIN}/services/auth/login/choice`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal: opts.signal,
  });
  if (!res.ok) throw apiFailure('getLoginChoice', res, await readApiErrorMessage(res));
  return LoginChoiceSchema.parse(await res.json());
}

export async function postLoginPick(
  input: LoginPickInput,
  opts: CallOpts = {},
): Promise<LoginPickResult> {
  const body = LoginPickInputSchema.parse(input);
  const res = await fetch(`${AUTH_ORIGIN}/services/auth/login/pick`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) throw apiFailure('postLoginPick', res, await readApiErrorMessage(res));
  return LoginPickResultSchema.parse(await res.json());
}

export async function getAllSessions(token: string, opts: CallOpts = {}): Promise<AllSessions> {
  const res = await bearerFetch(`${AUTH_ORIGIN}/services/auth/tokens/`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: token, Accept: 'application/json' },
    signal: opts.signal,
  });
  if (!res.ok) throw apiFailure('getAllSessions', res, await readApiErrorMessage(res));
  return AllSessionsSchema.parse(await res.json());
}

export async function revokeSession(
  token: string,
  tokenId: string,
  opts: CallOpts = {},
): Promise<void> {
  const res = await bearerFetch(
    `${AUTH_ORIGIN}/services/auth/tokens/revoke/${encodeURIComponent(tokenId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: token },
      signal: opts.signal,
    },
  );
  if (!res.ok) {
    throw apiFailure('revokeSession', res, await readApiErrorMessage(res));
  }
}

// kbase auth has no /logout endpoint. Sign-out = look up session id,
// then DELETE it. Matches kbase-ui's useLogout semantic.
export async function logout(token: string, opts: CallOpts = {}): Promise<void> {
  const info = await getTokenInfo(token, opts);
  await revokeSession(token, info.id, opts);
}
