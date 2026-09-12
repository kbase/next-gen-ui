import { z } from 'zod';
import { createStore } from '../core/subscribable';

// User settings that are not layout: which plugin answers the prompt bar,
// which suggests commands for what is typed there, and which keys the user
// rebound. Persisted separately so resetting the layout keeps them — a
// layout is an arrangement of panels and is discarded whenever its shape
// changes, and a chosen key is neither. A stored copy that does not match
// this schema is dropped for the defaults; the key is bumped when the shape
// moves.
export const SettingsSchema = z.object({
  // Plugin ids, both of them: there is no "none" to choose, so nothing here
  // is nullable and no reader has a null to handle. An id naming a plugin
  // that is not installed is the one thing that can go wrong, and it is the
  // same thing as a plugin the user uninstalled.
  assistant: z.string(),
  intent: z.string(),
  // Chord text to qualified command name, over commands/keys.ts's defaults.
  // '' takes a default away without putting anything in its place.
  keybindings: z.record(z.string(), z.string()),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SETTINGS_STORAGE_KEY = 'workbench.settings.v5';

export interface SettingsStore {
  get: () => Settings;
  set: (patch: Partial<Settings>) => void;
  version: () => number;
  subscribe: (listener: () => void) => () => void;
}

// A patch naming the value a field already holds is not a change: the
// settings document is written to storage on every change, and a reader that
// picks its current assistant out of a menu should not cost a write.
const same = (a: Settings, b: Settings) =>
  a.assistant === b.assistant && a.intent === b.intent && a.keybindings === b.keybindings;

// The two plugin choices have to be named: which plugin answers the bar and
// which ranks what is typed there is the app's decision, and there is no
// value for "neither". Everything else defaults here, so a field added later
// does not have to be added at every construction site.
export function createSettingsStore(
  initial: Pick<Settings, 'assistant' | 'intent'> & Partial<Settings>,
): SettingsStore {
  const settings = createStore<Settings>({ keybindings: {}, ...initial }, same);
  return {
    get: settings.get,
    set: (patch) => settings.set({ ...settings.get(), ...patch }),
    version: settings.version,
    subscribe: settings.subscribe,
  };
}
