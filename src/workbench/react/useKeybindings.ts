import { useEffect } from 'react';
import { resolveKeybinding } from '../commands';
import { useRun, useServices } from './context';

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

// One window-level listener. Inside a text field only Alt chords fire, so
// Ctrl+Z and "/" keep their editing meaning there.
export function useKeybindings() {
  const { store } = useServices();
  const run = useRun();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditable(event.target) && !event.altKey) return;
      const command = resolveKeybinding(event, store.get().keybindings);
      if (!command) return;
      event.preventDefault();
      void run(command);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, run]);
}
