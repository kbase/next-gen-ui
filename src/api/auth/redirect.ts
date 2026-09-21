// Open-redirect-resistant URL helper. Used at both ends of the login
// flow because nextRequest round-trips through the auth service
// unsigned, so we treat it as untrusted on receipt regardless of
// source. URL-parsing against our own origin collapses
// protocol-relative inputs, absolute URLs, and exotic schemes
// (`javascript:`, `data:`, `mailto:`) into something we can compare
// against window.location.origin.
//
// Two consumers want different return shapes:
//   - search-param storage (e.g. `?redirect=/foo?bar=1`): a flat string
//     that round-trips through the URL → use `safeRedirect`.
//   - TanStack Router `redirect({ to, search, hash })`: separate
//     pathname / search / hash → use `parseSafeRedirect`.
// Passing `'/foo?bar=1'` directly to `to:` makes the router treat the
// `?` as part of the pathname; route resolution fails.

export interface SafeRedirectParts {
  pathname: string;
  search?: Record<string, string>;
  hash?: string;
}

export function safeRedirect(input: string | undefined | null): string {
  if (typeof input !== 'string' || input.length === 0) return '/';
  if (input.includes('\\')) return '/';

  let parsed: URL;
  try {
    parsed = new URL(input, window.location.origin);
  } catch {
    return '/';
  }
  if (parsed.origin !== window.location.origin) return '/';

  const pathname = parsed.pathname;
  if (!pathname.startsWith('/')) return '/';
  if (pathname.startsWith('//')) return '/';

  return pathname + parsed.search + parsed.hash;
}

export function parseSafeRedirect(input: string | undefined | null): SafeRedirectParts {
  const safe = safeRedirect(input);
  if (safe === '/') return { pathname: '/' };
  const url = new URL(safe, window.location.origin);
  const search: Record<string, string> = {};
  for (const [k, v] of url.searchParams) search[k] = v;
  return {
    pathname: url.pathname,
    search: Object.keys(search).length > 0 ? search : undefined,
    hash: url.hash || undefined,
  };
}

// Reads `nextRequest` out of the `state` JSON in a posted redirecturl.
export function nextRequestFromRedirectUrl(
  redirecturl: string | null | undefined,
): string | undefined {
  if (!redirecturl) return undefined;
  let state: string | null;
  try {
    state = new URL(redirecturl).searchParams.get('state');
  } catch {
    return undefined;
  }
  if (!state) return undefined;
  try {
    const parsed: unknown = JSON.parse(state);
    if (parsed && typeof parsed === 'object' && 'nextRequest' in parsed) {
      const next = (parsed as { nextRequest: unknown }).nextRequest;
      return typeof next === 'string' ? next : undefined;
    }
  } catch {
    /* not JSON */
  }
  return undefined;
}
