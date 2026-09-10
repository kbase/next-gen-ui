import type { PanelId } from '../core';

// Panel titles arrive from the panels themselves after they render, so they
// live beside the layout rather than in it.
export interface TitleStore {
  get: (id: PanelId) => string | undefined;
  set: (id: PanelId, title: string) => void;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

export function createTitleStore(): TitleStore {
  const titles = new Map<PanelId, string>();
  let version = 0;
  const listeners = new Set<() => void>();
  return {
    get: (id) => titles.get(id),
    set(id, title) {
      if (titles.get(id) === title) return;
      titles.set(id, title);
      version += 1;
      listeners.forEach((l) => l());
    },
    version: () => version,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
