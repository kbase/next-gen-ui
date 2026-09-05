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

export interface WorkbenchStore {
  get(): Layout;
  subscribe(listener: () => void): () => void;
  dispatch(op: Operation): DispatchResult;
  // Restore from storage or a deep link; not undoable.
  replace(layout: Layout): void;
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
  let layout = initial;
  const past: Layout[] = [];
  const future: Layout[] = [];
  const listeners = new Set<() => void>();

  function set(next: Layout) {
    if (next === layout) return;
    layout = next;
    listeners.forEach((l) => l());
  }

  function push(snapshot: Layout) {
    past.push(snapshot);
    if (past.length > limit) past.shift();
    future.length = 0;
  }

  return {
    get: () => layout,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(op) {
      const before = layout;
      const after = reduce(before, op, ctx);
      if (after === before) return { changed: false, announcement: '' };
      if (isUndoable(op)) push(before);
      const announcement = describe(op, before, after, title);
      set(after);
      return { changed: true, announcement };
    },
    replace(next) {
      set(next);
    },
    undo() {
      const previous = past.pop();
      if (!previous) return false;
      future.push(layout);
      set(previous);
      return true;
    },
    redo() {
      const next = future.pop();
      if (!next) return false;
      past.push(layout);
      set(next);
      return true;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
