import { createContext, useContext, useEffect } from 'react';

// What a panel component can learn about itself. The host provides this
// context; a plugin reads it with `usePanel`. Types here mirror the core's
// on purpose: the SDK is a leaf and imports nothing from the workbench.

export type PanelKind = 'navigator' | 'document';

// One step of a panel's trail: where this level is, in the plugin's own
// words, and how to get back to it. `action` is the same shape a prompt
// bar offer carries, so a crumb click and a suggestion open alike; a
// crumb that only names a level leaves it out.
export interface Crumb {
  label: string;
  action?: PanelParams;
}
export type PanelParams = Record<string, string>;

export interface PanelHandle {
  id: string;
  plugin: string;
  kind: PanelKind;
  params: PanelParams;
  focused: boolean;
  // The tab or block title. Until a panel sets one, the host shows a
  // placeholder built from the plugin's title and the panel's params.
  setTitle: (title: string) => void;
  // The trail shown above this panel. Declaring none means no row. The
  // host also borrows from it to tell two same-titled tabs apart.
  setCrumbs: (crumbs: Crumb[]) => void;
}

export const PanelContext = createContext<PanelHandle | null>(null);

export function usePanel(): PanelHandle {
  const handle = useContext(PanelContext);
  if (!handle) throw new Error('usePanel() called outside a workbench panel');
  return handle;
}

export function usePanelTitle(title: string): void {
  const { setTitle } = usePanel();
  useEffect(() => setTitle(title), [setTitle, title]);
}

export function usePanelBreadcrumbs(crumbs: Crumb[]): void {
  const { setCrumbs } = usePanel();
  // Compared by value: a plugin builds this array during render, so its
  // identity changes on every pass while its content rarely does.
  const key = JSON.stringify(crumbs);
  useEffect(() => setCrumbs(JSON.parse(key) as Crumb[]), [setCrumbs, key]);
}
