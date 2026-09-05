import type { GroupId, Layout, PanelId } from './layout';
import { makePanel } from './layout';
import type { Operation, MainTarget } from './operations';
import { navigatorId, placementOf } from './placement';
import {
  activateTab,
  groupOf,
  groups,
  insertTab,
  normalize,
  removeTab,
  setSizes,
  splitGroup,
} from './tree';

export interface ReduceContext {
  // Fresh ids for groups and splits created by open/move. Injected so tests
  // can be deterministic.
  newId: () => string;
}

let counter = 0;
export const defaultContext: ReduceContext = {
  newId: () => `n${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`,
};

// What a locked layout refuses: changes to the arrangement itself. Usage
// (open, close, focus, fold, bars, collapse) stays free.
const STRUCTURAL: ReadonlySet<Operation['type']> = new Set<Operation['type']>([
  'move',
  'resize',
  'pin',
  'unpin',
]);

export function reduce(layout: Layout, op: Operation, ctx: ReduceContext = defaultContext): Layout {
  if (layout.locked && STRUCTURAL.has(op.type)) return layout;
  switch (op.type) {
    case 'open':
      return open(layout, op, ctx);
    case 'close':
      return close(layout, op.panel);
    case 'focus':
      return focus(layout, op.panel);
    case 'move':
      return move(layout, op, ctx);
    case 'resize':
      return { ...layout, main: setSizes(layout.main, op.split, op.sizes) };
    case 'pin':
      return pin(layout, op.plugin, op.index);
    case 'unpin':
      return unpin(layout, op.plugin);
    case 'fold':
      return fold(layout, op.panel, op.folded);
    case 'sidebar':
      return {
        ...layout,
        sidebar: {
          ...layout.sidebar,
          collapsed: op.collapsed ?? layout.sidebar.collapsed,
          width: op.width ?? layout.sidebar.width,
          sizes: op.sizes ?? layout.sidebar.sizes,
        },
      };
    case 'bar':
      return { ...layout, bars: { ...layout.bars, [op.bar]: op.visible } };
    case 'bind': {
      const keybindings = { ...layout.keybindings };
      if (op.command === null) delete keybindings[op.key];
      else keybindings[op.key] = op.command;
      return { ...layout, keybindings };
    }
    case 'lock':
      return op.locked === layout.locked ? layout : { ...layout, locked: op.locked };
  }
}

// The group a new tab lands in when the caller names none: the focused
// panel's group, else the first group in reading order.
function defaultGroup(layout: Layout): GroupId {
  const focused = layout.focus ? groupOf(layout.main, layout.focus) : undefined;
  return (focused ?? groups(layout.main)[0]).id;
}

function place(layout: Layout, panel: PanelId, target: MainTarget | undefined, ctx: ReduceContext) {
  let main = removeTab(layout.main, panel);
  if (target && 'side' in target) {
    main = splitGroup(main, target.group, target.side, panel, ctx.newId(), ctx.newId());
  } else {
    const group = target?.group ?? defaultGroup(layout);
    let index = target?.index;
    // A same-group move gives its index in pre-removal terms.
    const from = groupOf(layout.main, panel);
    if (index !== undefined && from && from.id === group && from.tabs.indexOf(panel) < index) {
      index -= 1;
    }
    main = insertTab(main, group, panel, index);
  }
  return normalize(main, layout.main.id);
}

function open(
  layout: Layout,
  op: Extract<Operation, { type: 'open' }>,
  ctx: ReduceContext,
): Layout {
  const { panel } = op;
  const existing = placementOf(layout, panel.id);
  if (existing.zone !== 'none') return focus(layout, panel.id);

  const panels = { ...layout.panels, [panel.id]: panel };
  // A navigator whose plugin is pinned opens into its sidebar block.
  if (panel.kind === 'navigator' && !op.target && layout.sidebar.pinned.includes(panel.plugin)) {
    return focus({ ...layout, panels }, panel.id);
  }
  return {
    ...layout,
    panels,
    main: place(layout, panel.id, op.target, ctx),
    focus: panel.id,
  };
}

function close(layout: Layout, id: PanelId): Layout {
  const panel = layout.panels[id];
  if (!panel) return layout;
  const placement = placementOf(layout, id);
  // A sidebar navigator is folded or unpinned, never closed.
  if (placement.zone === 'sidebar') return layout;

  const main = normalize(removeTab(layout.main, id), layout.main.id);
  const panels = { ...layout.panels };
  const keepsSidebarSeat =
    panel.kind === 'navigator' && layout.sidebar.pinned.includes(panel.plugin);
  if (!keepsSidebarSeat) delete panels[id];

  let focus = layout.focus;
  if (focus === id) {
    // Focus stays in the group the tab left if it survived, else falls to
    // the first group in reading order.
    const own =
      placement.zone === 'main' ? groups(main).find((g) => g.id === placement.group) : undefined;
    focus = own?.active ?? groups(main)[0]?.active ?? null;
  }
  return repair({ ...layout, panels, main, focus });
}

function focus(layout: Layout, id: PanelId): Layout {
  const placement = placementOf(layout, id);
  if (placement.zone === 'none') return layout;
  const settled =
    layout.focus === id && (placement.zone === 'main' ? placement.active : !placement.folded);
  if (settled) return layout;
  let next: Layout = { ...layout, focus: id };
  if (placement.zone === 'main') next = { ...next, main: activateTab(layout.main, id) };
  if (placement.zone === 'sidebar' && placement.folded) {
    next = {
      ...next,
      sidebar: { ...layout.sidebar, folded: layout.sidebar.folded.filter((f) => f !== id) },
    };
  }
  return next;
}

function move(
  layout: Layout,
  op: Extract<Operation, { type: 'move' }>,
  ctx: ReduceContext,
): Layout {
  const panel = layout.panels[op.panel];
  if (!panel) return layout;
  if ('zone' in op.to) {
    if (panel.kind !== 'navigator') return layout;
    const removed = removeTab(layout.main, panel.id);
    // normalize rebuilds the tree, so skip it when nothing was removed —
    // a pure pin reorder must compare reference-equal below.
    const main = removed === layout.main ? layout.main : normalize(removed, layout.main.id);
    const before = layout.sidebar.pinned;
    const from = before.indexOf(panel.plugin);
    const without = before.filter((p) => p !== panel.plugin);
    // No index: a pinned plugin keeps its place, a new one appends.
    let at = op.to.index ?? (from !== -1 ? from : without.length);
    // A given index is in pre-removal terms, like a same-group tab move.
    if (op.to.index !== undefined && from !== -1 && from < op.to.index) at -= 1;
    at = Math.max(0, Math.min(at, without.length));
    const pinned = [...without.slice(0, at), panel.plugin, ...without.slice(at)];
    const unchanged = main === layout.main && pinned.every((p, i) => p === before[i]);
    if (unchanged) return focus(layout, panel.id);
    return { ...layout, main, sidebar: { ...layout.sidebar, pinned }, focus: panel.id };
  }
  return { ...layout, main: place(layout, panel.id, op.to, ctx), focus: panel.id };
}

function pin(layout: Layout, plugin: string, index?: number): Layout {
  const pinned = layout.sidebar.pinned.filter((p) => p !== plugin);
  const at = index === undefined ? pinned.length : Math.max(0, Math.min(index, pinned.length));
  pinned.splice(at, 0, plugin);
  const nav = makePanel(plugin, 'navigator');
  const panels = layout.panels[nav.id] ? layout.panels : { ...layout.panels, [nav.id]: nav };
  return { ...layout, panels, sidebar: { ...layout.sidebar, pinned } };
}

function unpin(layout: Layout, plugin: string): Layout {
  if (!layout.sidebar.pinned.includes(plugin)) return layout;
  const nav = navigatorId(plugin);
  const panels = { ...layout.panels };
  if (!groupOf(layout.main, nav)) delete panels[nav];
  const sizes = { ...layout.sidebar.sizes };
  delete sizes[plugin];
  return repair({
    ...layout,
    panels,
    sidebar: {
      ...layout.sidebar,
      pinned: layout.sidebar.pinned.filter((p) => p !== plugin),
      folded: layout.sidebar.folded.filter((f) => f !== nav),
      sizes,
    },
  });
}

function fold(layout: Layout, id: PanelId, folded: boolean): Layout {
  if (placementOf(layout, id).zone !== 'sidebar') return layout;
  const without = layout.sidebar.folded.filter((f) => f !== id);
  return {
    ...layout,
    sidebar: { ...layout.sidebar, folded: folded ? [...without, id] : without },
  };
}

// Drops references to panels that no longer exist. Cheap enough to run
// after any operation that removes something.
export function repair(layout: Layout): Layout {
  const known = (id: PanelId | null): id is PanelId => id !== null && id in layout.panels;
  const folded = layout.sidebar.folded.filter(known);
  const focus = known(layout.focus) ? layout.focus : null;
  if (folded.length === layout.sidebar.folded.length && focus === layout.focus) return layout;
  return { ...layout, focus, sidebar: { ...layout.sidebar, folded } };
}
