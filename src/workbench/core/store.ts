import type { TitleOf } from './describe';
import { describe } from './describe';
import type { Layout } from './layout';
import type { Operation } from './operations';
import { isUndoable } from './operations';
import type { ReduceContext } from './reduce';
import { defaultContext, reduce } from './reduce';

export interface DispatchResult {
  changed: boolean;
  announcement: string;
}

// The operation behind each part of the layout that something outside the
// layout has to answer for: where the DOM caret goes, and what the browser
// history gets. Each field is replaced only by an operation that changed
// that part, so a reader that wakes up several operations later still reads
// the one that produced the value it is looking at — a fold cannot answer
// for a focus, and a navigation that moved nothing answers for nothing.
export interface Cause {
  // What put `focus` on the panel the layout now focuses. Null after a
  // restored snapshot, which is no operation of the user's.
  focus: Operation | null;
  // The last path move, and the panel it moved.
  path: Extract<Operation, { type: 'setPath' }> | null;
}

// Layout and cause are read together so a reader cannot pair one with the
// other's successor.
export interface Snapshot {
  layout: Layout;
  cause: Cause;
}

export interface WorkbenchStore {
  get(): Layout;
  snapshot(): Snapshot;
  subscribe(listener: () => void): () => void;
  dispatch(op: Operation): DispatchResult;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}

export interface StoreOptions {
  initial: Layout;
  title?: TitleOf;
  ctx?: ReduceContext;
  limit?: number;
}

// Undo is a stack of whole layouts: each structural operation pushes the
// layout it replaced.
export function createWorkbenchStore({
  initial,
  title = (id) => id,
  ctx = defaultContext,
  limit = 50,
}: StoreOptions): WorkbenchStore {
  const noCause: Cause = { focus: null, path: null };
  let current: Snapshot = { layout: initial, cause: noCause };
  const past: Layout[] = [];
  const future: Layout[] = [];
  const listeners = new Set<() => void>();

  function set(next: Snapshot) {
    current = next;
    listeners.forEach((l) => l());
  }

  function push(snapshot: Layout) {
    past.push(snapshot);
    if (past.length > limit) past.shift();
    future.length = 0;
  }

  return {
    get: () => current.layout,
    snapshot: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(op) {
      const before = current.layout;
      const after = reduce(before, op, ctx);
      if (after === before) return { changed: false, announcement: '' };
      if (isUndoable(op)) push(before);
      const announcement = describe(op, before, after, title);
      set({
        layout: after,
        cause: {
          focus: after.focus === before.focus ? current.cause.focus : op,
          path: op.type === 'setPath' ? op : current.cause.path,
        },
      });
      return { changed: true, announcement };
    },
    // Undo and redo restore a layout without replaying what built it, so
    // neither the focus nor the path they land on has an operation behind
    // it any more.
    undo() {
      const previous = past.pop();
      if (!previous) return false;
      future.push(current.layout);
      set({ layout: previous, cause: noCause });
      return true;
    },
    redo() {
      const next = future.pop();
      if (!next) return false;
      past.push(current.layout);
      set({ layout: next, cause: noCause });
      return true;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
