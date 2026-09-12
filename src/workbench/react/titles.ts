import type { PanelId } from '../core';
import { createKeyedStore } from '../core/subscribable';

// Panel titles arrive from the panels themselves after they render, so they
// live beside the layout rather than in it.
export interface TitleStore {
  get: (id: PanelId) => string | undefined;
  set: (id: PanelId, title: string) => void;
  // A panel that has closed. Called through `forgetPanel` (react/services.ts),
  // which drops a panel's title, trail and terms in one go.
  forget: (id: PanelId) => void;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

export function createTitleStore(): TitleStore {
  return createKeyedStore<PanelId, string>();
}
