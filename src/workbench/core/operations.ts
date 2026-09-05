import type { BarName, GroupId, Panel, PanelId, PluginId, SplitId } from './layout';
import type { Side } from './tree';

// The dispatch vocabulary. Every user action on the arrangement is one of
// these; `reduce` applies them and `describe` announces them. Undo does not
// invert operations, it restores snapshots, so nothing here needs an inverse.

export type MainTarget = { group: GroupId; index?: number } | { group: GroupId; side: Side };
// A sidebar index is a pin position, in pre-removal terms like a
// same-group tab index; absent, a pinned plugin keeps its place and a new
// one appends.
export type Target = MainTarget | { zone: 'sidebar'; index?: number };

export type Operation =
  | { type: 'open'; panel: Panel; target?: MainTarget }
  | { type: 'close'; panel: PanelId }
  | { type: 'focus'; panel: PanelId }
  | { type: 'move'; panel: PanelId; to: Target }
  | { type: 'resize'; split: SplitId; sizes: number[] }
  | { type: 'pin'; plugin: PluginId; index?: number }
  | { type: 'unpin'; plugin: PluginId }
  | { type: 'fold'; panel: PanelId; folded: boolean }
  | { type: 'sidebar'; collapsed?: boolean; width?: number; sizes?: Record<PluginId, number> }
  | { type: 'bar'; bar: BarName; visible: boolean }
  | { type: 'bind'; key: string; command: string | null }
  | { type: 'lock'; locked: boolean };

export type OperationType = Operation['type'];

// Structural changes get an undo snapshot; focus, sizing and bindings do not.
const UNDOABLE: ReadonlySet<OperationType> = new Set<OperationType>([
  'open',
  'close',
  'move',
  'pin',
  'unpin',
  'fold',
  'bar',
]);

export function isUndoable(op: Operation): boolean {
  return UNDOABLE.has(op.type);
}
