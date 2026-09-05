import type { Layout, PanelId, Side, WorkbenchStore } from '../core';
import { groupOf, groups, placementOf } from '../core';
import type { Command } from './registry';

// The workbench's own commands. They speak to the store like any plugin
// command would and announce through the same live region.

export interface WorkbenchCommandDeps {
  store: WorkbenchStore;
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
  announce,
  plugins,
  focusPrompt,
}: WorkbenchCommandDeps): Command[] {
  const dispatch = (op: Parameters<WorkbenchStore['dispatch']>[0]) => {
    const result = store.dispatch(op);
    if (result.changed) announce(result.announcement);
    return result.changed;
  };
  const focusTo = (target: PanelId | null) => {
    if (target) dispatch({ type: 'focus', panel: target });
  };
  const moveFocused = (side: Side) => {
    const layout = store.get();
    const focus = focusedPanel(layout);
    if (!focus) return;
    const group = groupOf(layout.main, focus);
    if (!group || group.tabs.length < 2) {
      announce('Nothing to split away from');
      return;
    }
    dispatch({ type: 'move', panel: focus, to: { group: group.id, side } });
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
      title: 'Close the focused panel',
      run: () => {
        const focus = focusedPanel(store.get());
        if (focus) dispatch({ type: 'close', panel: focus });
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
      run: () => moveFocused('left'),
    },
    {
      ...base,
      name: 'move-right',
      title: 'Split the panel to the right',
      run: () => moveFocused('right'),
    },
    { ...base, name: 'move-up', title: 'Split the panel upward', run: () => moveFocused('top') },
    {
      ...base,
      name: 'move-down',
      title: 'Split the panel downward',
      run: () => moveFocused('bottom'),
    },
    {
      ...base,
      name: 'fold',
      title: 'Fold or unfold the focused sidebar panel',
      when: (ctx) => ctx.focusKind === 'navigator',
      run: () => {
        const layout = store.get();
        const focus = focusedPanel(layout);
        if (!focus) return;
        const placement = placementOf(layout, focus);
        if (placement.zone !== 'sidebar') return;
        dispatch({ type: 'fold', panel: focus, folded: !placement.folded });
      },
    },
    {
      ...base,
      name: 'sidebar',
      title: 'Collapse or expand the sidebar',
      run: () => dispatch({ type: 'sidebar', collapsed: !store.get().sidebar.collapsed }),
    },
    {
      ...base,
      name: 'pin',
      title: 'Pin a plugin to the sidebar',
      args: [
        {
          name: 'plugin',
          type: 'string',
          required: true,
          complete: (p) => plugins().filter((id) => id.startsWith(p)),
        },
      ],
      run: ({ plugin }) => {
        if (!plugins().includes(String(plugin))) {
          announce(`No plugin named ${String(plugin)}`);
          return;
        }
        dispatch({ type: 'pin', plugin: String(plugin) });
      },
    },
    {
      ...base,
      name: 'unpin',
      title: 'Remove a plugin from the sidebar',
      args: [
        {
          name: 'plugin',
          type: 'string',
          required: true,
          complete: (p) => store.get().sidebar.pinned.filter((id) => id.startsWith(p)),
        },
      ],
      run: ({ plugin }) => dispatch({ type: 'unpin', plugin: String(plugin) }),
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
