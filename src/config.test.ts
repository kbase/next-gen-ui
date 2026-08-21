import { afterEach, describe, expect, it, vi } from 'vitest';

// config.ts reads the DOM once at module load, so each case needs a fresh
// module registry with the meta tags already in place.
async function loadConfig() {
  const mod = await import('./config');
  return mod.config;
}

function setMeta(name: string, content: string) {
  const el = document.createElement('meta');
  el.setAttribute('name', `config:${name}`);
  el.setAttribute('content', content);
  document.head.appendChild(el);
}

afterEach(() => {
  document.head.querySelectorAll('meta[name^="config:"]').forEach((el) => el.remove());
  vi.resetModules();
});

describe('runtime config', () => {
  it('reads rendered meta tags', async () => {
    setMeta('auth-origin', 'https://ci.kbase.us');
    setMeta('cookie-domain', '.kbase.us');
    const config = await loadConfig();
    expect(config.authOrigin).toBe('https://ci.kbase.us');
    expect(config.cookieDomain).toBe('.kbase.us');
  });

  // A container started without AUTH_ORIGIN: the entrypoint leaves the
  // placeholder, and that is a supported deployment, not a broken one.
  it('reads a surviving auth-origin placeholder as no auth service', async () => {
    setMeta('auth-origin', '__AUTH_ORIGIN__');
    setMeta('cookie-domain', '__COOKIE_DOMAIN__');
    const mod = await import('./config');
    expect(mod.config.authOrigin).toBeNull();
    expect(mod.config.cookieDomain).toBeUndefined();
    expect(mod.authEnabled).toBe(false);
  });

  it('reports auth as enabled when an origin is configured', async () => {
    setMeta('auth-origin', 'https://kbase.us');
    const mod = await import('./config');
    expect(mod.authEnabled).toBe(true);
  });

  // No tags at all is the dev build; the plugin is build-only. Distinct
  // from a surviving placeholder, which only a container produces.
  it('falls back to the default when no meta tags are present', async () => {
    const mod = await import('./config');
    expect(mod.config.authOrigin).toBe('https://kbase.us');
    expect(mod.config.cookieDomain).toBeUndefined();
    expect(mod.authEnabled).toBe(true);
  });

  // Empty is a real value, not an absent one: it means same-origin, which is
  // how dev talks to the Vite proxy. It must not collapse to the default.
  it('treats an empty auth origin as same-origin, not as unset', async () => {
    setMeta('auth-origin', '');
    const config = await loadConfig();
    expect(config.authOrigin).toBe('');
  });

  // Distinct from absent: '' means omit the Domain attribute entirely,
  // absent means derive it from the current host.
  it('treats an empty cookie domain as an explicit override', async () => {
    setMeta('auth-origin', 'https://kbase.us');
    setMeta('cookie-domain', '');
    const config = await loadConfig();
    expect(config.cookieDomain).toBe('');
  });
});
