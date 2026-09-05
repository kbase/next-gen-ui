import { describe, expect, it } from 'vitest';
import { buildPath, extraParams, matchRoute, routeParams } from './routes';

describe('routes', () => {
  it('binds $ segments and rejects the rest', () => {
    expect(matchRoute('/arc/$slug', '/arc/nitro')).toEqual({ slug: 'nitro' });
    expect(matchRoute('/arc/$slug', '/job/nitro')).toBeNull();
    expect(matchRoute('/arc/$slug', '/arc/nitro/extra')).toBeNull();
    expect(matchRoute('/', '/')).toEqual({});
    expect(matchRoute('/', '/x')).toBeNull();
  });

  it('round-trips values that need escaping', () => {
    const path = buildPath('/data/$ref', { ref: '1/2/3' });
    expect(path).toBe('/data/1%2F2%2F3');
    expect(matchRoute('/data/$ref', path)).toEqual({ ref: '1/2/3' });
  });

  it('lists the params a route needs', () => {
    expect(routeParams('/a/$b/c/$d')).toEqual(['b', 'd']);
    expect(() => buildPath('/a/$b', {})).toThrow(/needs param b/);
  });

  it('separates the params a route has no segment for', () => {
    expect(extraParams('/arc/$slug', { slug: 'nitro' })).toEqual({});
    expect(extraParams('/', { q: 'P0A7B8' })).toEqual({ q: 'P0A7B8' });
    expect(extraParams('/arc/$slug', { slug: 'nitro', q: 'x' })).toEqual({ q: 'x' });
  });
});
