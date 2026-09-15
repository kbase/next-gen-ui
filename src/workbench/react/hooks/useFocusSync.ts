import { useEffect } from 'react';
import type { Operation, PanelId } from '../../core';
import { useSnapshot } from '../context';

export function focusPanelElement(id: PanelId | null): boolean {
  if (!id) return false;
  const el = document.querySelector<HTMLElement>(`[data-panel-tab="${CSS.escape(id)}"]`);
  if (!el) return false;
  el.focus();
  return true;
}

// Who moved the layout's focus. Only a `focus` operation can say 'user': an
// open, a move or a close that changed focus is not a gesture that placed
// the caret, and a restored snapshot names no operation at all.
function movedBy(op: Operation | null): 'user' | 'command' {
  return op?.type === 'focus' ? (op.by ?? 'command') : 'command';
}

// When a command moves the layout's focus, move the DOM's focus with it so
// the keyboard user ends up on the tab (or block header) they just reached.
// Focus changes the user made with a pointer or by tabbing into a panel are
// left alone: they already have the caret where they want it.
export function useFocusSync() {
  const { layout, cause } = useSnapshot();
  const focus = layout.focus;
  const by = cause.focus;
  // `by` changes only when `focus` does, so this runs once per focus move
  // and never for the fold, resize or navigation in between.
  useEffect(() => {
    if (movedBy(by) === 'command') focusPanelElement(focus);
  }, [focus, by]);
}
