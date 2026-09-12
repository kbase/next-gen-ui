import { useEffect } from 'react';
import { keybindingTable, resolveKeybinding } from '../commands';
import { useRun, useServices } from './context';

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

// One window-level listener. Inside a text field only Alt chords fire, so
// Ctrl+Z and "/" keep their editing meaning there.
export function useKeybindings() {
  const { settings, registry } = useServices();
  const run = useRun();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditable(event.target) && !event.altKey) return;
      // Built per keypress rather than memoised: it is a dozen entries, and
      // it has to answer for the overrides and the registry as they are now.
      const table = keybindingTable({
        overrides: settings.get().keybindings,
        exists: (command) => registry.get(command) !== undefined,
      });
      const command = resolveKeybinding(event, table);
      if (!command) return;
      event.preventDefault();
      void run(command);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings, registry, run]);
}
