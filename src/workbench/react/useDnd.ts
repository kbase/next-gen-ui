import { createContext, useContext } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragData, DropData } from './dnd';
import { dragId, dropId } from './dnd';
import { useLayout } from './context';

export const DraggingContext = createContext<DragData | null>(null);

// True while a panel is being dragged; drop targets that only make sense
// mid-drag (group edges) render then.
export function useDragging(): DragData | null {
  return useContext(DraggingContext);
}

export function useDragPanel(data: DragData) {
  // A locked layout keeps its arrangement; drags are off at the source
  // (the reducer refuses the move anyway — this removes the affordance).
  const locked = useLayout().locked;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId(data.panel),
    data,
    disabled: locked,
  });
  // dnd-kit's attributes describe keyboard dragging, which this workbench
  // does through commands instead; only the pointer handlers are kept.
  void attributes;
  return { dragRef: setNodeRef, dragHandlers: listeners ?? {}, isDragging };
}

export function useDropTarget(data: DropData, disabled = false) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId(data), data, disabled });
  return { dropRef: setNodeRef, isOver };
}
