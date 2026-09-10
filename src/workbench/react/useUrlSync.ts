import { useEffect, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { Layout, Panel } from '../core';
import { useLayout, useServices } from './context';

export const WORKBENCH_PATH = '/workbench';

// A history entry remembers the panel it was written for, so Back can
// return that panel to that path rather than opening a second one.
declare module '@tanstack/history' {
  interface HistoryState {
    panel?: string;
  }
}

// The URL that names a panel, or null for one the URL does not address
// (panes). The path is the plugin's, carried whole: query string included,
// never parsed here.
export function pathForPanel(panel: Panel | undefined): string | null {
  if (!panel || panel.kind !== 'route') return null;
  return `/p/${panel.plugin}${panel.path === '/' ? '' : panel.path}`;
}

// The URL names the focused route panel and nothing else about the layout.
// Opening a panel pushes history, and so does a `navigate` inside one unless
// it asked to replace; moving focus between open panels replaces, so Back
// walks through what was opened and where it went, not every click. A write
// equal to the current location is skipped, which is also what stops the
// URL→layout→URL loop: resolving a link focuses the same panel.
export function useUrlSync() {
  const layout = useLayout();
  const { navIntentRef } = useServices();
  const router = useRouter();
  const previous = useRef<Layout | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = layout;
    const panel = layout.focus ? layout.panels[layout.focus] : undefined;
    const href = pathForPanel(panel);
    const current = router.state.location.pathname + router.state.location.searchStr;
    if (href && panel && href === current) {
      navIntentRef.current = 'push';
      // An entry this sync did not write — the deep link the session started
      // on — is claimed for the panel it resolved to, so Back to it later
      // re-targets that panel instead of opening another.
      if (router.state.location.state.panel !== panel.id) {
        void router.navigate({ href, replace: true, state: { panel: panel.id } });
      }
      return;
    }
    if (!before) return;
    if (before.focus === layout.focus && before.panels === layout.panels) return;

    if (href && panel) {
      const intent = navIntentRef.current;
      navIntentRef.current = 'push';
      const justOpened = !(panel.id in before.panels);
      const moved = before.panels[panel.id]?.path !== panel.path;
      const push = justOpened || (moved && intent === 'push');
      void router.navigate({ href, replace: !push, state: { panel: panel.id } });
    } else if (current.startsWith('/p/')) {
      // Focus went to something without an address (a pane, or nothing).
      // Panes never touch the URL, so it keeps naming the page it named, as
      // long as that page is still open; once closed, fall back to the bare
      // workbench so a reload does not reopen it.
      const stillOpen = Object.values(layout.panels).some((p) => pathForPanel(p) === current);
      if (!stillOpen) void router.navigate({ to: WORKBENCH_PATH, replace: true });
    }
  }, [layout, navIntentRef, router]);
}
