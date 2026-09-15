import { createKeyedStore } from './subscribable';

// What each open panel says it is about.
//
// Panels push; the host does not pull. A panel already holds whatever it took
// to know its subject — the dossier it fetched, the row it selected — so
// asking it again from outside would mean fetching the page twice.

export interface TermStore {
  get: (panel: string) => string[];
  set: (panel: string, terms: string[]) => void;
  // A panel that has closed. Called through `forgetPanel` (host/services.ts),
  // which drops a panel's title, trail and terms in one go.
  forget: (panel: string) => void;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

const NONE: string[] = [];

const same = (a: string[], b: string[]) => a.length === b.length && a.every((t, i) => t === b[i]);

export function createTermStore(): TermStore {
  // A panel declares its terms from its render, so the same values arrive on
  // every pass; comparing the terms rather than the array is what keeps a
  // re-render from re-asking every plugin.
  const byPanel = createKeyedStore<string, string[]>({ equal: same });
  return {
    get: (panel) => byPanel.get(panel) ?? NONE,
    set: byPanel.set,
    forget: byPanel.forget,
    subscribe: byPanel.subscribe,
    version: byPanel.version,
  };
}
