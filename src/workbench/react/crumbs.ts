import type { Crumb } from '../../plugins/sdk';
import type { PanelId } from '../core';
import { createKeyedStore } from '../core/subscribable';

// A panel's trail, like its title, is known only once the panel renders,
// so it lives beside the layout rather than in it. Two things read it: the
// breadcrumb row above the panel, and the tab strip, which borrows a crumb
// to tell two same-titled tabs apart.
export interface CrumbStore {
  get: (id: PanelId) => Crumb[];
  set: (id: PanelId, crumbs: Crumb[]) => void;
  // A panel that has closed. Called through `forgetPanel` (react/services.ts),
  // which drops a panel's title, trail and terms in one go.
  forget: (id: PanelId) => void;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

// One array for every panel with no trail, so a reader that renders the
// result gets the same identity each time it asks.
const NONE: Crumb[] = [];

const same = (a: Crumb[], b: Crumb[]) =>
  a.length === b.length &&
  a.every((c, i) => c.label === b[i].label && c.path === b[i].path && c.icon === b[i].icon);

export function createCrumbStore(): CrumbStore {
  // A panel rebuilds its trail on every render, so the comparison is over the
  // crumbs rather than the array.
  const trails = createKeyedStore<PanelId, Crumb[]>({ equal: same });
  return {
    get: (id) => trails.get(id) ?? NONE,
    set: trails.set,
    forget: trails.forget,
    version: trails.version,
    subscribe: trails.subscribe,
  };
}
