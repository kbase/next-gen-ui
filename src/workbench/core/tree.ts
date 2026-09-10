import type { GroupId, Group, Node, PanelId, Split, SplitDir, SplitId } from './layout';
import { emptyGroup } from './layout';

// Pure helpers over the main-area tree. Every mutator returns a new tree and
// leaves the input untouched; callers run `normalize` once after editing.

export type Side = 'left' | 'right' | 'top' | 'bottom';

export function groups(node: Node): Group[] {
  if (node.kind === 'group') return [node];
  return node.children.flatMap(groups);
}

export function findNode(node: Node, id: string): Node | undefined {
  if (node.id === id) return node;
  if (node.kind === 'split') {
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function groupOf(node: Node, panel: PanelId): Group | undefined {
  return groups(node).find((g) => g.tabs.includes(panel));
}

export function parentOf(root: Node, id: string): Split | undefined {
  if (root.kind !== 'split') return undefined;
  if (root.children.some((c) => c.id === id)) return root;
  for (const child of root.children) {
    const found = parentOf(child, id);
    if (found) return found;
  }
  return undefined;
}

export function replaceNode(root: Node, id: string, replacement: (node: Node) => Node): Node {
  if (root.id === id) return replacement(root);
  if (root.kind === 'group') return root;
  let changed = false;
  const children = root.children.map((child) => {
    const next = replaceNode(child, id, replacement);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

export function insertTab(root: Node, group: GroupId, panel: PanelId, index?: number): Node {
  return replaceNode(root, group, (node) => {
    if (node.kind !== 'group') return node;
    const tabs = node.tabs.filter((t) => t !== panel);
    const at = index === undefined ? tabs.length : Math.max(0, Math.min(index, tabs.length));
    tabs.splice(at, 0, panel);
    return { ...node, tabs, active: panel };
  });
}

// Removing the active tab activates its right-hand neighbour, else the new
// last tab; the group itself survives until `normalize`.
export function removeTab(root: Node, panel: PanelId): Node {
  const owner = groupOf(root, panel);
  if (!owner) return root;
  return replaceNode(root, owner.id, (node) => {
    if (node.kind !== 'group') return node;
    const at = node.tabs.indexOf(panel);
    const tabs = node.tabs.filter((t) => t !== panel);
    let active = node.active;
    if (active === panel) active = tabs[Math.min(at, tabs.length - 1)] ?? null;
    return { ...node, tabs, active };
  });
}

export function activateTab(root: Node, panel: PanelId): Node {
  const owner = groupOf(root, panel);
  if (!owner || owner.active === panel) return root;
  return replaceNode(root, owner.id, (node) =>
    node.kind === 'group' ? { ...node, active: panel } : node,
  );
}

function dirOf(side: Side): SplitDir {
  return side === 'left' || side === 'right' ? 'row' : 'col';
}

// Splits `group` so a new group holding `panel` sits on `side` of it. The
// two take equal halves of the space the old group had.
export function splitGroup(
  root: Node,
  group: GroupId,
  side: Side,
  panel: PanelId,
  newGroupId: GroupId,
  newSplitId: SplitId,
): Node {
  const fresh: Group = { kind: 'group', id: newGroupId, tabs: [panel], active: panel };
  const before = side === 'left' || side === 'top';
  return replaceNode(root, group, (node) => ({
    kind: 'split',
    id: newSplitId,
    dir: dirOf(side),
    sizes: [0.5, 0.5],
    children: before ? [fresh, node] : [node, fresh],
  }));
}

export function setSizes(root: Node, split: SplitId, sizes: number[]): Node {
  return replaceNode(root, split, (node) =>
    node.kind === 'split' && node.children.length === sizes.length
      ? { ...node, sizes: normalizeSizes(sizes) }
      : node,
  );
}

export function normalizeSizes(sizes: number[]): number[] {
  const clean = sizes.map((s) => (Number.isFinite(s) && s > 0 ? s : 0));
  const total = clean.reduce((a, b) => a + b, 0);
  if (total <= 0) return sizes.map(() => 1 / sizes.length);
  return clean.map((s) => s / total);
}

// Drops empty groups, unwraps single-child splits, merges a split into a
// same-direction parent, and keeps one group at the root when everything
// else is gone. Idempotent.
export function normalize(root: Node, rootGroupId: GroupId = root.id): Node {
  const result = normalizeNode(root);
  return result ?? emptyGroup(rootGroupId);
}

function normalizeNode(node: Node): Node | null {
  if (node.kind === 'group') return node.tabs.length === 0 ? null : node;

  const children: Node[] = [];
  const sizes: number[] = [];
  node.children.forEach((child, i) => {
    const next = normalizeNode(child);
    if (!next) return;
    const size = node.sizes[i] ?? 1 / node.children.length;
    if (next.kind === 'split' && next.dir === node.dir) {
      next.children.forEach((grandchild, j) => {
        children.push(grandchild);
        sizes.push(size * (next.sizes[j] ?? 1 / next.children.length));
      });
    } else {
      children.push(next);
      sizes.push(size);
    }
  });

  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { ...node, children, sizes: normalizeSizes(sizes) };
}
