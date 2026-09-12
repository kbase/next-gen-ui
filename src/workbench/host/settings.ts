import { z } from 'zod';

// User settings that are not layout: which plugin answers the prompt bar,
// and which suggests commands for what is typed there. Persisted separately
// so resetting the layout keeps them. A stored copy that does not match this
// schema is dropped for the defaults; the key is bumped when the shape moves.
export const SettingsSchema = z.object({
  assistant: z.string().nullable(),
  intent: z.string().nullable(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SETTINGS_STORAGE_KEY = 'workbench.settings.v3';

export interface SettingsStore {
  get: () => Settings;
  set: (patch: Partial<Settings>) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createSettingsStore(initial: Settings): SettingsStore {
  let current: Settings = initial;
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
