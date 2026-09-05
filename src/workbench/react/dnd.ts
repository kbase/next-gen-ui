import type { GroupId, Operation, PanelId, PanelKind, PluginId, Side } from '../core';

// Pointer drag and drop. dnd-kit supplies the sensors; this module names what
// can be dragged and where it can land, and turns a drop into an operation.
// Every drop here has a keyboard route through commands and context menus,
// so the pointer path adds no capability, only speed.

export interface DragData {
  panel: PanelId;
  kind: PanelKind;
  // Set when the thing being dragged is the sidebar's preview, which is
  // not in the layout: dropping it pins this plugin rather than moving a
  // panel that does not exist yet.
  pins?: PluginId;
}

export type DropData =
  | { type: 'tab'; group: GroupId; index: number }
  | { type: 'edge'; group: GroupId; side: Side }
  | { type: 'group'; group: GroupId }
  // A pin position: dropping a navigator on a block inserts before it.
  | { type: 'pin'; index: number }
  | { type: 'sidebar' };

export const dragId = (panel: PanelId) => `drag:${panel}`;
export const dropId = (data: DropData) => {
  switch (data.type) {
    case 'tab':
      return `drop:tab:${data.group}:${data.index}`;
    case 'edge':
      return `drop:edge:${data.group}:${data.side}`;
    case 'group':
      return `drop:group:${data.group}`;
    case 'pin':
      return `drop:pin:${data.index}`;
    case 'sidebar':
      return 'drop:sidebar';
  }
};

export function dropOperation(active: DragData, over: DropData): Operation | null {
  switch (over.type) {
    case 'tab':
      return { type: 'move', panel: active.panel, to: { group: over.group, index: over.index } };
    case 'group':
      return { type: 'move', panel: active.panel, to: { group: over.group } };
    case 'edge':
      return { type: 'move', panel: active.panel, to: { group: over.group, side: over.side } };
    case 'pin':
      if (active.pins) return { type: 'pin', plugin: active.pins, index: over.index };
      if (active.kind !== 'navigator') return null;
      return { type: 'move', panel: active.panel, to: { zone: 'sidebar', index: over.index } };
    case 'sidebar':
      if (active.pins) return { type: 'pin', plugin: active.pins };
      if (active.kind !== 'navigator') return null;
      return { type: 'move', panel: active.panel, to: { zone: 'sidebar' } };
  }
}
