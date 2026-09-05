import type { Group, Layout, Panel, PanelId } from './layout';
import type { Operation } from './operations';
import { findNode, groupOf } from './tree';

// The sentence the live region reads after an operation. Titles come from
// the caller because the core does not know what a panel renders; the panel
// record travels with the id because it may be absent from the layout on
// either side of the operation (just opened, or just closed).
export type TitleOf = (id: PanelId, panel: Panel | undefined) => string;

// The tab the listener will see beside the moved one: the group's active tab,
// or when that is the moved panel itself, the neighbour that takes over.
function anchorIn(group: Group, moving: PanelId, title: (id: PanelId) => string): string {
  if (group.active && group.active !== moving) return title(group.active);
  const at = group.tabs.indexOf(moving);
  const rest = group.tabs.filter((t) => t !== moving);
  const next = rest[Math.min(at, rest.length - 1)];
  return next ? title(next) : 'the group';
}

const SIDE_WORDS = { left: 'left of', right: 'right of', top: 'above', bottom: 'below' } as const;

export function describe(op: Operation, before: Layout, after: Layout, titleOf: TitleOf): string {
  const title = (id: PanelId) => titleOf(id, before.panels[id] ?? after.panels[id]);
  switch (op.type) {
    case 'open':
      return `Opened ${title(op.panel.id)}`;
    case 'close':
      return `Closed ${title(op.panel)}`;
    case 'focus':
      return `${title(op.panel)} focused`;
    case 'move': {
      const name = title(op.panel);
      if ('zone' in op.to) return `Moved ${name} to the sidebar`;
      const group = findNode(before.main, op.to.group);
      const anchor = group?.kind === 'group' ? anchorIn(group, op.panel, title) : 'the group';
      if ('side' in op.to) return `Moved ${name} ${SIDE_WORDS[op.to.side]} ${anchor}`;
      const own = groupOf(before.main, op.panel);
      if (own && own.id === op.to.group && op.to.index !== undefined) {
        return `Moved ${name} to position ${op.to.index + 1}`;
      }
      return `Moved ${name} into the group with ${anchor}`;
    }
    case 'resize':
      return 'Resized';
    case 'pin':
      return `Pinned ${op.plugin} to the sidebar`;
    case 'unpin':
      return `Unpinned ${op.plugin} from the sidebar`;
    case 'fold':
      return `${op.folded ? 'Folded' : 'Unfolded'} ${title(op.panel)}`;
    case 'sidebar':
      if (op.collapsed === true) return 'Sidebar collapsed';
      if (op.collapsed === false) return 'Sidebar expanded';
      return 'Sidebar resized';
    case 'bar':
      return `${op.bar === 'status' ? 'Status bar' : 'Prompt bar'} ${op.visible ? 'shown' : 'hidden'}`;
    case 'bind':
      return op.command ? `${op.key} now runs ${op.command}` : `${op.key} unbound`;
    case 'lock':
      return op.locked ? 'Layout locked' : 'Layout unlocked';
  }
}
