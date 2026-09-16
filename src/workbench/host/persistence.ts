import type { Layout, StoredCartItem } from '../core';
import { CART_STORAGE_KEY, defaultLayout, deserialize, readCart } from '../core';
import type { Settings } from './settings';
import { SETTINGS_STORAGE_KEY, SettingsSchema } from './settings';

// The key names the saved shape. A layout written against a different
// `LayoutSchema` lives under a different key and is never read again; the
// cart and the settings keys work the same way.
export const LAYOUT_STORAGE_KEY = 'workbench.layout.v4';
export const PLUGINS_STORAGE_KEY = 'workbench.plugins.v1';

// The documents a workbench keeps between sessions, one per kind. Each is
// plain JSON, so a store needs no encoder of its own and nothing here has a
// shape a wire cannot carry.
export interface WorkbenchDocs {
  layout: Layout;
  cart: readonly StoredCartItem[];
  settings: Settings;
  // The manifest URLs of the plugins installed by URL, installed again at
  // the next start.
  plugins: readonly string[];
}

// A document that was absent or unreadable comes back null, and the workbench
// starts that one from its default.
export type LoadedDocs = { [K in keyof WorkbenchDocs]: WorkbenchDocs[K] | null };

// Called with the whole document after every change to it. The workbench does
// not learn whether a save landed: an implementation absorbs its own failures
// (see `saveTo` for why that is the right answer for `Storage`).
export type SaveWorkbench = <K extends keyof WorkbenchDocs>(kind: K, doc: WorkbenchDocs[K]) => void;

export interface WorkbenchPersistence {
  loaded: LoadedDocs;
  save: SaveWorkbench;
}

// A workbench that starts fresh and forgets: what tests and a browser with no
// readable storage get.
export const noPersistence: WorkbenchPersistence = {
  loaded: { layout: null, cart: null, settings: null, plugins: null },
  save: () => {},
};

const KEYS: Record<keyof WorkbenchDocs, string> = {
  layout: LAYOUT_STORAGE_KEY,
  cart: CART_STORAGE_KEY,
  settings: SETTINGS_STORAGE_KEY,
  plugins: PLUGINS_STORAGE_KEY,
};

// Async because the caller runs before React mounts and can afford to wait,
// and because a store that answers over the network has to be allowed to.
// `Storage` answers immediately.
export async function loadWorkbench(storage: Storage): Promise<WorkbenchPersistence> {
  return {
    loaded: {
      layout: readLayout(read(storage, LAYOUT_STORAGE_KEY)),
      cart: readCart(read(storage, CART_STORAGE_KEY)),
      settings: readSettings(read(storage, SETTINGS_STORAGE_KEY)),
      plugins: readPlugins(read(storage, PLUGINS_STORAGE_KEY)),
    },
    save: saveTo(storage),
  };
}

function readPlugins(text: string | null): readonly string[] | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) && parsed.every((url) => typeof url === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

function saveTo(storage: Storage): SaveWorkbench {
  return (kind, doc) => {
    try {
      storage.setItem(KEYS[kind], JSON.stringify(doc));
    } catch {
      // A full quota or a browser that refuses storage costs the session its
      // persistence and nothing else. Reporting it would put an error in front
      // of a user who can do nothing about it, mid-edit, on every keystroke
      // that changed the layout.
    }
  };
}

function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function readLayout(text: string | null): Layout | null {
  if (!text) return null;
  let unreadable = false;
  const layout = deserialize(text, () => {
    unreadable = true;
    // Discarded: the fresh layout is the workbench's to build, from the
    // pinned set it was configured with.
    return defaultLayout();
  });
  return unreadable ? null : layout;
}

function readSettings(text: string | null): Settings | null {
  if (!text) return null;
  try {
    const parsed = SettingsSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
