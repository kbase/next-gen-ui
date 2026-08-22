import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// jsdom has no matchMedia. These defaults describe a desktop browser; a test
// that needs otherwise calls setMedia.
const MEDIA_DEFAULTS: Record<string, boolean> = {
  '(any-pointer: fine)': true,
  '(pointer: coarse)': false,
};

type MediaListener = EventListenerOrEventListenerObject;

const mediaOverrides = new Map<string, boolean>();
const mediaListeners = new Map<string, Set<MediaListener>>();

const notify = (listener: MediaListener) =>
  typeof listener === 'function'
    ? listener(new Event('change'))
    : listener.handleEvent(new Event('change'));

/** Override one query for the current test. Cleared after each. */
export function setMedia(query: string, matches: boolean) {
  mediaOverrides.set(query, matches);
  mediaListeners.get(query)?.forEach(notify);
}

window.matchMedia = (query: string) =>
  ({
    get matches() {
      return mediaOverrides.get(query) ?? MEDIA_DEFAULTS[query] ?? false;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => {
      let set = mediaListeners.get(query);
      if (!set) mediaListeners.set(query, (set = new Set()));
      set.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      mediaListeners.get(query)?.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;

afterEach(() => mediaOverrides.clear());

// Default handler set: a happy /api/V2/me. Tests override per-case
// via `server.use(...)`. The wildcard host avoids depending on the
// resolved VITE_AUTH_ORIGIN at test time. `idents`, `created`,
// `lastlogin` are deliberately omitted to exercise MeSchema defaults.
export const defaultMeBody = { user: 'tester', display: 'Tester' };
export const defaultTokenInfoBody = { id: 'session-1', user: 'tester', mfa: 'Used' as const };

export const handlers = [
  http.get('*/services/auth/api/V2/me', () => HttpResponse.json(defaultMeBody)),
  http.get('*/services/auth/api/V2/token', () => HttpResponse.json(defaultTokenInfoBody)),
];

export const server = setupServer(...handlers);

// `bypass` so unit tests that stub global.fetch directly (e.g.
// queries.test.ts) aren't flagged.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
