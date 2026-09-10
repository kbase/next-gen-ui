import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Side } from '../core';
import { useDispatch, useLayout, useServices, useTitle } from './context';
import type { DragData, DropData } from './dnd';
import { dropOperation } from './dnd';
import { DraggingContext, useDragging, useDropTarget } from './useDnd';
import styles from './Workbench.module.css';

// Prefer the target under the pointer; fall back to overlap so a fast
// release still lands somewhere sensible.
const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length ? within : rectIntersection(args);
};

// Nothing spoken by dnd-kit: the drop dispatches an operation and the
// workbench's own live region announces the result.
const silent = {
  announcements: {
    onDragStart: () => '',
    onDragOver: () => '',
    onDragEnd: () => '',
    onDragCancel: () => '',
  },
  screenReaderInstructions: { draggable: '' },
};

export function WorkbenchDnd({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState<DragData | null>(null);
  const dispatch = useDispatch();
  const { preview } = useServices();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (event: DragStartEvent) => {
    setDragging(event.active.data.current as DragData);
  };
  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const active = event.active.data.current as DragData | undefined;
    const over = event.over?.data.current as DropData | undefined;
    if (!active || !over) return;
    const op = dropOperation(active, over);
    if (!op) return;
    dispatch(op);
    // A dropped preview has become a real block; the ephemeral one goes.
    if (op.type === 'pin') preview.set(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      accessibility={silent}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <DraggingContext value={dragging}>{children}</DraggingContext>
      <DragOverlay dropAnimation={null}>{dragging && <Ghost data={dragging} />}</DragOverlay>
    </DndContext>
  );
}

function Ghost({ data }: { data: DragData }) {
  const layout = useLayout();
  const title = useTitle(layout.panels[data.panel], data.panel);
  return <div className={styles.dragGhost}>{title}</div>;
}

// Four bands around a group's body plus the centre. Rendered over the panel
// only while something is being dragged, so they never intercept clicks.
export function GroupDropZones({ group }: { group: string }) {
  const dragging = useDragging();
  if (!dragging) return null;
  return (
    <div className={styles.dropZones}>
      {(['left', 'right', 'top', 'bottom'] as Side[]).map((side) => (
        <EdgeZone key={side} group={group} side={side} />
      ))}
      <CentreZone group={group} />
    </div>
  );
}

function EdgeZone({ group, side }: { group: string; side: Side }) {
  const { dropRef, isOver } = useDropTarget({ type: 'edge', group, side });
  return (
    <div
      ref={dropRef}
      className={`${styles.dropZone} ${styles[`dropZone_${side}`]}`}
      data-over={isOver || undefined}
    />
  );
}

function CentreZone({ group }: { group: string }) {
  const { dropRef, isOver } = useDropTarget({ type: 'group', group });
  return (
    <div
      ref={dropRef}
      className={`${styles.dropZone} ${styles.dropZone_centre}`}
      data-over={isOver || undefined}
    />
  );
}
