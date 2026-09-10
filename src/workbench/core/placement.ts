import type { GroupId, Layout, Panel, PanelId } from './layout';
import { paneId } from './layout';
import { groupOf, groups } from './tree';

// Where a panel is shown. A panel in the flat map is either a tab in the
// main tree, the pane block of a pinned plugin in the sidebar, or nowhere
// (orphaned; `repair` drops it).
export type Placement =
  | { zone: 'main'; group: GroupId; active: boolean }
  | { zone: 'sidebar'; folded: boolean }
  | { zone: 'none' };

export function placementOf(layout: Layout, id: PanelId): Placement {
  const group = groupOf(layout.main, id);
  if (group) return { zone: 'main', group: group.id, active: group.active === id };
  const panel = layout.panels[id];
  if (panel && panel.kind === 'pane' && layout.sidebar.pinned.includes(panel.plugin)) {
    return { zone: 'sidebar', folded: layout.sidebar.folded.includes(id) };
  }
  return { zone: 'none' };
}

// The panes shown in the sidebar, in pin order; a pinned plugin whose pane
// has been dragged into the main area contributes nothing here.
export function sidebarPanels(layout: Layout): Panel[] {
  return layout.sidebar.pinned.flatMap((plugin) => {
    const panel = layout.panels[paneId(plugin)];
    return panel && !groupOf(layout.main, panel.id) ? [panel] : [];
  });
}

// The panel at the front of the main area: the focused group's active tab if
// focus is in the main area, otherwise the first group's — what a reader
// would call "the page I am on". Never `layout.focus` on its own: focus
// follows the pointer into the sidebar, and a click in a pane must not make
// the workbench about the pane.
export function frontPanel(layout: Layout): Panel | null {
  const focused = layout.focus ? groupOf(layout.main, layout.focus) : undefined;
  const group = focused ?? groups(layout.main).find((g) => g.tabs.length > 0);
  const id = group?.active ?? group?.tabs[0];
  return id ? (layout.panels[id] ?? null) : null;
}
