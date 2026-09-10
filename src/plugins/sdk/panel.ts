import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

// What a panel can learn about itself and ask of its own tab. The host
// provides this context; a plugin reads it with `usePanel`. Types here
// mirror the core's on purpose: the SDK is a leaf and imports nothing from
// the workbench.

export type PanelKind = 'route' | 'pane';

// One step of a panel's trail: where this level is, in the plugin's own
// words, and the path that gets back to it. A crumb that only names a
// level leaves the path out.
export interface Crumb {
  label: string;
  path?: string;
  // A mark beside the label, by name from the host's icon set. A plugin naming
  // itself as the root of its own trail wants its own mark there, and the
  // manifest's `icon` is the name to give.
  icon?: string;
}

export interface PanelHandle {
  // Opaque; stable while the panel lives, whatever its path becomes.
  id: string;
  plugin: string;
  kind: PanelKind;
  // Everything under /p/<plugin>, query string included; '' for a pane.
  path: string;
  focused: boolean;
  // Changes this panel's path in place and pushes a history entry, or
  // replaces the current one.
  navigate: (path: string, options?: { replace?: boolean }) => void;
  // The tab or block title. Until a panel sets one, the host shows a
  // placeholder built from the plugin's title and the panel's path.
  setTitle: (title: string) => void;
  // The trail shown above this panel. Declaring none means no row. The
  // host also borrows from it to tell two same-titled tabs apart.
  setCrumbs: (crumbs: Crumb[]) => void;
  // What this panel is about, as namespaced terms — `uniprot:P0AEX9`,
  // `taxon:562`. The host asks other plugins what they have about them.
  setTerms: (terms: string[]) => void;
  // Fires when the path or focus changes. For a mount that is not React;
  // `usePanel` re-renders on the same changes.
  subscribe: (listener: () => void) => () => void;
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

// Declared from inside the panel, which already holds whatever it took to
// know them. The host does not pull: a hook it ran itself would run outside
// the panel, and a plugin would have to fetch its own page again to answer.
export function usePanelTerms(terms: string[]): void {
  const { setTerms } = usePanel();
  const key = terms.join(',');
  useEffect(() => setTerms(key ? key.split(',') : []), [setTerms, key]);
}

export function usePanelBreadcrumbs(crumbs: Crumb[]): void {
  const { setCrumbs } = usePanel();
  // Compared by value: a plugin builds this array during render, so its
  // identity changes on every pass while its content rarely does.
  const key = JSON.stringify(crumbs);
  useEffect(() => setCrumbs(JSON.parse(key) as Crumb[]), [setCrumbs, key]);
}

// The panel's path as React state: re-renders the caller when it changes.
export function usePanelPath(): string {
  const handle = usePanel();
  return useSyncExternalStore(handle.subscribe, () => handle.path);
}
