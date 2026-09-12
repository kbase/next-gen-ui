import { z } from 'zod';

// User settings that are not layout: which plugin answers the prompt bar,
// which suggests commands for what is typed there, and which keys the user
// rebound. Persisted separately so resetting the layout keeps them — a
// layout is an arrangement of panels and is discarded whenever its shape
// changes, and a chosen key is neither. A stored copy that does not match
// this schema is dropped for the defaults; the key is bumped when the shape
// moves.
export const SettingsSchema = z.object({
  assistant: z.string().nullable(),
  intent: z.string().nullable(),
  // Chord text to qualified command name, over commands/keys.ts's defaults.
  // '' takes a default away without putting anything in its place.
  keybindings: z.record(z.string(), z.string()),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SETTINGS_STORAGE_KEY = 'workbench.settings.v4';

export const DEFAULT_SETTINGS: Settings = { assistant: null, intent: null, keybindings: {} };

export interface SettingsStore {
  get: () => Settings;
  set: (patch: Partial<Settings>) => void;
  subscribe: (listener: () => void) => () => void;
}

// A caller that names only some fields gets the defaults for the rest, so a
// field added here does not have to be added at every construction site.
export function createSettingsStore(initial: Partial<Settings> = {}): SettingsStore {
  let current: Settings = { ...DEFAULT_SETTINGS, ...initial };
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(patch) {
      current = { ...current, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
