// Document routes from manifests, TanStack style: `/arc/$slug`. A pattern
// segment starting with `$` binds one path segment; everything else must
// match exactly. Params are the identity of a document, so a route with no
// `$` segments names a document with empty params (an app that is one page).

export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const want = segments(pattern);
  const have = segments(path);
  if (want.length !== have.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith('$')) params[want[i].slice(1)] = decodeURIComponent(have[i]);
    else if (want[i] !== have[i]) return null;
  }
  return params;
}

export function buildPath(pattern: string, params: Record<string, string>): string {
  const out = segments(pattern).map((seg) => {
    if (!seg.startsWith('$')) return seg;
    const value = params[seg.slice(1)];
    if (value === undefined) throw new Error(`route ${pattern} needs param ${seg.slice(1)}`);
    return encodeURIComponent(value);
  });
  return '/' + out.join('/');
}

// Params the route has no segment for. A document's params are its
// identity, so they have to survive the URL; a route says how to spell
// the ones it names, and the rest ride in the query string.
export function extraParams(
  pattern: string,
  params: Record<string, string>,
): Record<string, string> {
  const named = new Set(routeParams(pattern));
  return Object.fromEntries(Object.entries(params).filter(([key]) => !named.has(key)));
}

export function routeParams(pattern: string): string[] {
  return segments(pattern)
    .filter((s) => s.startsWith('$'))
    .map((s) => s.slice(1));
}

function segments(path: string): string[] {
  return path.split('/').filter(Boolean);
}
