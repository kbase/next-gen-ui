import type { Crumb } from '../../plugins/sdk';
import type { PanelId } from '../core';

// A panel's trail, like its title, is known only once the panel renders,
// so it lives beside the layout rather than in it. Two things read it: the
// breadcrumb row above the panel, and the tab strip, which borrows a crumb
// to tell two same-titled tabs apart.
export interface CrumbStore {
  get: (id: PanelId) => Crumb[];
  set: (id: PanelId, crumbs: Crumb[]) => void;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

const NONE: Crumb[] = [];

const same = (a: Crumb[], b: Crumb[]) =>
  a.length === b.length &&
  a.every(
    (c, i) => c.label === b[i].label && JSON.stringify(c.action) === JSON.stringify(b[i].action),
  );

export function createCrumbStore(): CrumbStore {
  const trails = new Map<PanelId, Crumb[]>();
  let version = 0;
  const listeners = new Set<() => void>();
  return {
    get: (id) => trails.get(id) ?? NONE,
    set(id, crumbs) {
      const current = trails.get(id);
      if (current && same(current, crumbs)) return;
      trails.set(id, crumbs);
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
