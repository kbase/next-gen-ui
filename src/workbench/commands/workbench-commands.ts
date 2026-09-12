import type { BarName, Layout, Operation, PanelId, Side, WorkbenchStore } from '../core';
import { groupOf, groups, placementOf, sidebarPanels } from '../core';
import type { ArgSpec } from './args';
import type { Command } from './registry';

// Command arguments arrive as strings, so a typed bar name is checked
// against the layout's set before it reaches the store.
const BARS = ['prompt', 'status'] as const satisfies readonly BarName[];

// Said once, because every `panel` argument means it.
const FOCUSED = 'The focused panel, unless another is named';

// What folding and moving out both refuse, and for the same reason: the
// panel named is open, and is somewhere these commands do not reach.
const notInSidebar = (panel: PanelId) => `${panel} is not in the sidebar`;

function isBar(name: string): name is BarName {
  return (BARS as readonly string[]).includes(name);
}

// The workbench's own commands. They speak to the store like any plugin
// command would and announce through the same live region.

export interface WorkbenchCommandDeps {
  store: WorkbenchStore;
  // Applies an operation and announces what it changed; `announce` is for
  // what these commands say when they change nothing.
  dispatch: (op: Operation) => boolean;
  announce: (text: string) => void;
  // Ids of installed plugins, for `/pin` and `/unpin` completion.
  plugins: () => string[];
  // The prompt bar is DOM; the command only asks for it.
  focusPrompt: () => void;
}

function focusedPanel(layout: Layout): PanelId | null {
  return layout.focus;
}

function tabNeighbour(layout: Layout, offset: 1 | -1): PanelId | null {
  const focus = focusedPanel(layout);
  if (!focus) return null;
  const group = groupOf(layout.main, focus);
  if (!group) return null;
  const at = group.tabs.indexOf(focus);
  return group.tabs[(at + offset + group.tabs.length) % group.tabs.length] ?? null;
}

function groupNeighbour(layout: Layout, offset: 1 | -1): PanelId | null {
  const all = groups(layout.main).filter((g) => g.active);
  if (all.length === 0) return null;
  const focus = focusedPanel(layout);
  const at = focus ? all.findIndex((g) => g.tabs.includes(focus)) : -1;
  const next = all[(at + offset + all.length) % all.length];
  return next.active;
}

export function workbenchCommands({
  store,
  dispatch,
  announce,
  plugins,
  focusPrompt,
}: WorkbenchCommandDeps): Command[] {
  const focusTo = (target: PanelId | null) => {
    if (target) dispatch({ type: 'focus', panel: target });
  };
  // Every command that acts on one panel takes it the same way: absent, the
  // focused panel; named, whatever the surface that called was acting on.
  const panelArg = (pool: () => PanelId[]): ArgSpec => ({
    name: 'panel',
    complete: (p) => pool().filter((id) => id.startsWith(p)),
  });
  const panelFor = (value: string | undefined): PanelId | null => {
    const layout = store.get();
    if (value === undefined) return focusedPanel(layout);
    if (layout.panels[value]) return value;
    announce(`No panel named ${value}`);
    return null;
  };
  const split = (side: Side, panel: string | undefined) => {
    const target = panelFor(panel);
    if (!target) return;
    const layout = store.get();
    const group = groupOf(layout.main, target);
    if (!group || group.tabs.length < 2) {
      announce('Nothing to split away from');
      return;
    }
    dispatch({ type: 'move', panel: target, to: { group: group.id, side } });
  };
  // A command completes over what it can act on, so an offered id works.
  // Closing and splitting are main-area business: the store folds or unpins
  // a sidebar pane rather than closing it, and a block is in no group.
  const mainPanels = (): PanelId[] => {
    const layout = store.get();
    return Object.values(layout.panels)
      .filter((p) => placementOf(layout, p.id).zone === 'main')
      .map((p) => p.id);
  };
  // A route cannot go to the sidebar at all, and a pane already there is
  // where `move-to-sidebar` would put it.
  const movablePanes = (): PanelId[] =>
    mainPanels().filter((id) => store.get().panels[id]?.kind === 'pane');
  const sidebarPanes = (): PanelId[] => sidebarPanels(store.get()).map((p) => p.id);
  // Pin positions count from 0; the one past the last pin is where an
  // append lands, so it is offered too.
  const pinPositions = (): string[] => {
    const { pinned } = store.get().sidebar;
    return [...pinned.map((_, i) => String(i)), String(pinned.length)];
  };
  const base = { source: 'workbench' as const };

  return [
    {
      ...base,
      name: 'prompt',
      title: 'Focus the prompt bar',
      run: () => focusPrompt(),
    },
    {
      ...base,
      name: 'close',
      title: 'Close a panel',
      description: FOCUSED,
      args: [panelArg(mainPanels)],
      run: ({ panel }) => {
        const target = panelFor(panel);
        if (target) dispatch({ type: 'close', panel: target });
      },
    },
    {
      ...base,
      name: 'focus-next-tab',
      title: 'Focus the next tab',
      run: () => focusTo(tabNeighbour(store.get(), 1)),
    },
    {
      ...base,
      name: 'focus-previous-tab',
      title: 'Focus the previous tab',
      run: () => focusTo(tabNeighbour(store.get(), -1)),
    },
    {
      ...base,
      name: 'focus-next-group',
      title: 'Focus the next group',
      run: () => focusTo(groupNeighbour(store.get(), 1)),
    },
    {
      ...base,
      name: 'focus-previous-group',
      title: 'Focus the previous group',
      run: () => focusTo(groupNeighbour(store.get(), -1)),
    },
    {
      ...base,
      name: 'move-left',
      title: 'Split the panel to the left',
      description: FOCUSED,
      args: [panelArg(mainPanels)],
      run: ({ panel }) => split('left', panel),
    },
    {
      ...base,
      name: 'move-right',
      title: 'Split the panel to the right',
      description: FOCUSED,
      args: [panelArg(mainPanels)],
      run: ({ panel }) => split('right', panel),
    },
    {
      ...base,
      name: 'move-up',
      title: 'Split the panel upward',
      description: FOCUSED,
      args: [panelArg(mainPanels)],
      run: ({ panel }) => split('top', panel),
    },
    {
      ...base,
      name: 'move-down',
      title: 'Split the panel downward',
      description: FOCUSED,
      args: [panelArg(mainPanels)],
      run: ({ panel }) => split('bottom', panel),
    },
    {
      ...base,
      name: 'move-to-sidebar',
      title: 'Move a panel to the sidebar',
      description: FOCUSED,
      args: [panelArg(movablePanes)],
      run: ({ panel }) => {
        const target = panelFor(panel);
        if (!target) return;
        // The sidebar holds plugins' panes; the store would drop a `move`
        // naming a page, so say so instead of letting it fall silent.
        if (store.get().panels[target]?.kind !== 'pane') {
          announce(`${target} is a page, and only a plugin's pane goes in the sidebar`);
          return;
        }
        dispatch({ type: 'move', panel: target, to: { zone: 'sidebar' } });
      },
    },
    {
      ...base,
      name: 'move-to-main-area',
      title: 'Move a panel out of the sidebar',
      description: FOCUSED,
      args: [panelArg(sidebarPanes)],
      run: ({ panel }) => {
        const target = panelFor(panel);
        if (!target) return;
        const layout = store.get();
        // Only out of the sidebar: a tab given to this command would be
        // dragged across the main area's groups, which is not what it says.
        if (placementOf(layout, target).zone !== 'sidebar') {
          announce(notInSidebar(target));
          return;
        }
        const group = groups(layout.main)[0];
        if (group) dispatch({ type: 'move', panel: target, to: { group: group.id } });
      },
    },
    {
      ...base,
      name: 'fold',
      title: 'Fold or unfold a sidebar panel',
      description: FOCUSED,
      args: [panelArg(sidebarPanes)],
      run: ({ panel }) => {
        const target = panelFor(panel);
        if (!target) return;
        const placement = placementOf(store.get(), target);
        if (placement.zone !== 'sidebar') {
          announce(notInSidebar(target));
          return;
        }
        dispatch({ type: 'fold', panel: target, folded: !placement.folded });
      },
    },
    {
      ...base,
      name: 'sidebar',
      title: 'Collapse or expand the sidebar',
      run: () => {
        dispatch({ type: 'sidebar', collapsed: !store.get().sidebar.collapsed });
      },
    },
    {
      ...base,
      name: 'toggle-bar',
      title: 'Show or hide the prompt or status bar',
      args: [
        {
          name: 'bar',
          required: true,
          complete: (p) => BARS.filter((b) => b.startsWith(p)),
        },
      ],
      run: ({ bar }) => {
        const name = String(bar);
        if (!isBar(name)) {
          announce(`No bar named ${name}`);
          return;
        }
        dispatch({ type: 'bar', bar: name, visible: !store.get().bars[name] });
      },
    },
    {
      ...base,
      name: 'pin',
      title: 'Pin a plugin to the sidebar',
      description:
        'An index is a pin position counting from 0; without one a new pin appends and a pinned plugin keeps its place',
      args: [
        {
          name: 'plugin',
          required: true,
          complete: (p) => plugins().filter((id) => id.startsWith(p)),
        },
        {
          name: 'index',
          complete: (p) => pinPositions().filter((i) => i.startsWith(p)),
        },
      ],
      run: ({ plugin, index }) => {
        if (!plugins().includes(String(plugin))) {
          announce(`No plugin named ${String(plugin)}`);
          return;
        }
        let at: number | undefined;
        if (index !== undefined) {
          if (!pinPositions().includes(String(index))) {
            announce(`No pin position ${String(index)}`);
            return;
          }
          at = Number(index);
        }
        dispatch({ type: 'pin', plugin: String(plugin), index: at });
      },
    },
    {
      ...base,
      name: 'unpin',
      title: 'Remove a plugin from the sidebar',
      args: [
        {
          name: 'plugin',
          required: true,
          complete: (p) => store.get().sidebar.pinned.filter((id) => id.startsWith(p)),
        },
      ],
      run: ({ plugin }) => {
        dispatch({ type: 'unpin', plugin: String(plugin) });
      },
    },
    {
      ...base,
      name: 'undo',
      title: 'Undo the last layout change',
      run: () => announce(store.undo() ? 'Undone' : 'Nothing to undo'),
    },
    {
      ...base,
      name: 'redo',
      title: 'Redo the last undone layout change',
      run: () => announce(store.redo() ? 'Redone' : 'Nothing to redo'),
    },
    {
      ...base,
      name: 'lock-layout',
      title: 'Lock or unlock the layout',
      description: 'A locked layout keeps its arrangement; opening and closing panels stays free',
      run: () => {
        dispatch({ type: 'lock', locked: !store.get().locked });
      },
    },
  ];
}
