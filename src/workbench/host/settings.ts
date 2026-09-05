import { z } from 'zod';

// User settings that are not layout: today only which plugin answers the
// prompt bar. Persisted separately so resetting the layout keeps them.
export const SettingsSchema = z.object({
  assistant: z.string().nullable(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SETTINGS_STORAGE_KEY = 'workbench.settings.v1';

export interface SettingsStore {
  get: () => Settings;
  set: (patch: Partial<Settings>) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createSettingsStore(storage: Storage | null, defaults: Settings): SettingsStore {
  let current = read(storage) ?? defaults;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(patch) {
      current = { ...current, ...patch };
      try {
        storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
      } catch {
        // Persistence is best-effort.
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function read(storage: Storage | null): Settings | null {
  try {
    const text = storage?.getItem(SETTINGS_STORAGE_KEY);
    if (!text) return null;
    const parsed = SettingsSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
