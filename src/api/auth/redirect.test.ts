import { describe, expect, it } from 'vitest';
import { nextRequestFromRedirectUrl, parseSafeRedirect, safeRedirect } from './redirect';

const SAME_ORIGIN = globalThis.location.origin;

describe('safeRedirect', () => {
  describe('rejects', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
      ['protocol-relative', '//evil.com'],
      ['protocol-relative + path', '//evil.com/foo'],
      ['leading backslash path', '/\\evil'],
      ['bare backslash', '\\evil'],
      ['backslash within path', '/ok/\\evil'],
      ['absolute http foreign', 'http://evil.example'],
      ['absolute https foreign', 'https://evil.example'],
      ['javascript: scheme', 'javascript:alert(1)'],
      ['data: scheme', 'data:text/html,<script>alert(1)</script>'],
      ['vbscript: scheme', 'vbscript:msgbox(1)'],
      ['mailto:', 'mailto:foo@bar.com'],
    ])('rejects %s', (_label, input) => {
      expect(safeRedirect(input)).toBe('/');
    });
  });

  describe('accepts', () => {
    it.each([
      ['root', '/'],
      ['simple path', '/about'],
      ['path with query', '/foo?bar=1'],
      ['path with hash', '/foo#h'],
      ['path with query + hash', '/foo?a=1#b'],
      ['nested path', '/path/to/page'],
    ])('accepts %s', (_label, input) => {
      expect(safeRedirect(input)).toBe(input);
    });

    it('accepts same-origin absolute URL and strips the origin', () => {
      expect(safeRedirect(`${SAME_ORIGIN}/about?x=1#y`)).toBe('/about?x=1#y');
      expect(safeRedirect(`${SAME_ORIGIN}/`)).toBe('/');
    });

    it('rejects non-string inputs (defense against future search-schema relaxation)', () => {
      expect(safeRedirect(42 as unknown as string)).toBe('/');
      expect(safeRedirect({} as unknown as string)).toBe('/');
    });

    // Percent-encoded slashes don't decode in same-origin nav, so a
    // safe output is either `/` or a same-origin path that begins
    // with a single `/`. Never a protocol-relative escape.
    it.each([
      ['encoded leading slash in path', '/%2Fevil'],
      ['encoded slash mid-path', '/foo%2F../bar'],
      ['encoded protocol-relative-like input', '%2F%2Fevil.com'],
    ])('handles percent-encoded slash: %s', (_label, input) => {
      const out = safeRedirect(input);
      expect(out.startsWith('/')).toBe(true);
      expect(out.startsWith('//')).toBe(false);
    });
  });
});

describe('parseSafeRedirect', () => {
  it('splits pathname / search / hash', () => {
    expect(parseSafeRedirect('/account?tab=x#h')).toEqual({
      pathname: '/account',
      search: { tab: 'x' },
      hash: '#h',
    });
  });

  it('omits search and hash when absent', () => {
    expect(parseSafeRedirect('/about')).toEqual({ pathname: '/about' });
  });

  it('preserves multiple search params', () => {
    expect(parseSafeRedirect('/foo?a=1&b=2')).toEqual({
      pathname: '/foo',
      search: { a: '1', b: '2' },
    });
  });

  it('collapses rejected inputs to root pathname', () => {
    expect(parseSafeRedirect('//evil.com')).toEqual({ pathname: '/' });
    expect(parseSafeRedirect('javascript:alert(1)')).toEqual({ pathname: '/' });
    expect(parseSafeRedirect(undefined)).toEqual({ pathname: '/' });
    expect(parseSafeRedirect(null)).toEqual({ pathname: '/' });
  });
});

describe('nextRequestFromRedirectUrl', () => {
  it('reads nextRequest from the state blob of an echoed redirecturl', () => {
    const url = `${SAME_ORIGIN}/login/continue?state=${encodeURIComponent(
      JSON.stringify({ nextRequest: '/account?tab=sessions' }),
    )}`;
    expect(nextRequestFromRedirectUrl(url)).toBe('/account?tab=sessions');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['no state param', `${SAME_ORIGIN}/login/continue`],
    ['state not JSON', `${SAME_ORIGIN}/login/continue?state=nope`],
    ['state without nextRequest', `${SAME_ORIGIN}/login/continue?state=%7B%7D`],
    ['nextRequest not a string', `${SAME_ORIGIN}/login/continue?state=%7B%22nextRequest%22%3A1%7D`],
    ['not a URL', 'login/continue?state=%7B%7D'],
  ])('returns undefined for %s', (_label, input) => {
    expect(nextRequestFromRedirectUrl(input)).toBeUndefined();
  });
});
