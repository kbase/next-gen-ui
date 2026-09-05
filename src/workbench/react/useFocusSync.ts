import { useEffect } from 'react';
import type { PanelId } from '../core';
import { useLayout, useServices } from './context';

export function focusPanelElement(id: PanelId | null): boolean {
  if (!id) return false;
  const el = document.querySelector<HTMLElement>(`[data-panel-tab="${CSS.escape(id)}"]`);
  if (!el) return false;
  el.focus();
  return true;
}

// When a command moves the layout's focus, move the DOM's focus with it so
// the keyboard user ends up on the tab (or block header) they just reached.
// Focus changes the user made with a pointer or by tabbing into a panel are
// left alone: they already have the caret where they want it.
export function useFocusSync() {
  const { focus } = useLayout();
  const { focusIntentRef } = useServices();
  useEffect(() => {
    if (focusIntentRef.current === 'command') focusPanelElement(focus);
    focusIntentRef.current = 'command';
  }, [focus, focusIntentRef]);
}
