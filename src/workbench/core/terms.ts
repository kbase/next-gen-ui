// What each open panel says it is about.
//
// Panels push; the host does not pull. A panel already holds whatever it took
// to know its subject — the dossier it fetched, the row it selected — so
// asking it again from outside would mean fetching the page twice.

export interface TermStore {
  get: (panel: string) => string[];
  set: (panel: string, terms: string[]) => void;
  forget: (panel: string) => void;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createTermStore(): TermStore {
  const byPanel = new Map<string, string[]>();
  const listeners = new Set<() => void>();
  let version = 0;
  const changed = () => {
    version += 1;
    listeners.forEach((l) => l());
  };
  return {
    get: (panel) => byPanel.get(panel) ?? [],
    set(panel, terms) {
      const have = byPanel.get(panel);
      if (have && have.length === terms.length && have.every((t, i) => t === terms[i])) return;
      byPanel.set(panel, terms);
      changed();
    },
    forget(panel) {
      if (byPanel.delete(panel)) changed();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
