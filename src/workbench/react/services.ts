import type { ToastManager } from '@kbase/design-system';
import type {
  CartStore,
  Operation,
  PluginId,
  QueryStore,
  TermStore,
  WorkbenchStore,
} from '../core';
import type { CommandRegistry, RunStore } from '../commands';
import type { HostIndex } from '../host/installed';
import type { QueryRunner } from '../host/query/runner';
import type { SettingsStore } from '../host/settings';
import type { StatusStore } from '../host/status';
import type { Announcer } from './announcer';
import type { TitleStore } from './titles';
import type { CrumbStore } from './crumbs';

export interface PromptHandle {
  register: (focus: () => void) => () => void;
  focus: () => void;
}

export function createPromptHandle(): PromptHandle {
  let current: (() => void) | null = null;
  return {
    register(focus) {
      current = focus;
      return () => {
        if (current === focus) current = null;
      };
    },
    focus: () => current?.(),
  };
}

// Which unpinned plugin's pane is being looked at. Ephemeral, so it is not
// in the layout; a service rather than one component's state because
// anything may offer a preview — the sidebar's More menu, and Home — while
// only the sidebar shows one.
export interface PreviewHandle {
  get: () => PluginId | null;
  set: (plugin: PluginId | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createPreviewHandle(): PreviewHandle {
  let plugin: PluginId | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => plugin,
    set(next) {
      if (next === plugin) return;
      plugin = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// Everything the React layer needs, built once outside React so route
// loaders can reach the same store the components render.
export interface WorkbenchServices {
  store: WorkbenchStore;
  // Things the user has set aside. Host-owned: items come from plugins and are
  // consumed by assistants, and neither can hold state the other reaches.
  cart: CartStore;
  // What every plugin's recommend() said about each source of terms.
  query: QueryStore;
  queryRunner: QueryRunner;
  // What each open panel says it is about.
  terms: TermStore;
  // What each plugin's status() last said.
  status: StatusStore;
  registry: CommandRegistry;
  // Which commands are in flight, so the control that ran one shows busy.
  runs: RunStore;
  // Host-owned so a plugin's `notify` and a failed command reach the same
  // viewport as anything a component raises.
  toasts: ToastManager;
  source: HostIndex;
  settings: SettingsStore;
  // dispatch + announce, for code outside React (route loaders, plugin hosts).
  dispatch: (op: Operation) => boolean;
  titles: TitleStore;
  crumbs: CrumbStore;
  announcer: Announcer;
  // The prompt bar registers itself here on mount so commands can focus it.
  prompt: PromptHandle;
  // The unpinned pane the sidebar is previewing, if any.
  preview: PreviewHandle;
  // Set to 'user' by pointer/focus handlers right before they dispatch a
  // focus change, so the DOM-focus sync leaves the user's caret alone.
  focusIntentRef: { current: 'command' | 'user' };
  // Set right before a `setPath` dispatch, so the URL sync knows whether the
  // panel asked for a new history entry or to replace the current one. Read
  // once and reset to 'push'.
  navIntentRef: { current: 'push' | 'replace' };
}
