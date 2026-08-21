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

  // `npm run preview`, or an image whose entrypoint never ran.
  it('ignores unsubstituted placeholders and falls back', async () => {
    setMeta('auth-origin', '__AUTH_ORIGIN__');
    setMeta('cookie-domain', '__COOKIE_DOMAIN__');
    const config = await loadConfig();
    expect(config.authOrigin).toBe('https://kbase.us');
    expect(config.cookieDomain).toBeUndefined();
  });

  // No tags at all is the dev build; the plugin is build-only.
  it('falls back to the default when no meta tags are present', async () => {
    const config = await loadConfig();
    expect(config.authOrigin).toBe('https://kbase.us');
    expect(config.cookieDomain).toBeUndefined();
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
