import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  document.head.querySelectorAll('meta[name^="config:"]').forEach((el) => el.remove());
  for (const name of ['axb', 'a.b']) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
  vi.resetModules();
});

it('matches BACKUP_COOKIE_NAME literally', async () => {
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'config:backup-cookie-name');
  meta.setAttribute('content', 'a.b');
  document.head.appendChild(meta);
  document.cookie = 'axb=wrong; path=/';
  document.cookie = 'a.b=right; path=/';
  const { getToken } = await import('./cookie');
  expect(getToken()).toBe('right');
});
