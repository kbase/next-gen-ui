import type { ToastManager } from '@kbase/design-system';
import type {
  CartStore,
  Operation,
  Panel,
  PanelId,
  PluginId,
  QueryStore,
  TermStore,
  WorkbenchStore,
} from '../core';
import { createStore } from '../core/subscribable';
import type { CommandRegistry, RunStore } from '../commands';
import type { Announcer } from './announcer';
import type { CrumbStore } from './crumbs';
import type { DestinationStore } from './destination';
import type { HostIndex } from './installed';
import type { QueryRunner } from './query/runner';
import type { SettingsStore } from './settings';
import type { StatusStore } from './status';
import type { TitleStore } from './titles';

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
  const previewing = createStore<PluginId | null>(null);
  return {
    get: previewing.get,
    set: previewing.set,
    subscribe: previewing.subscribe,
  };
}

// Everything the React layer needs, built once outside React so route
// loaders can reach the same store the components render.
export interface WorkbenchServices {
  store: WorkbenchStore;
  // Things the user has set aside. Host-owned: items come from plugins and are
  // consumed by assistants, and neither can hold state the other reaches.
  cart: CartStore;
  // What every plugin offered for the text, and what each said about the
  // page's and the cart's terms.
  query: QueryStore;
  queryRunner: QueryRunner;
  // What each open panel says it is about.
  terms: TermStore;
  // What each plugin last pushed for the status bar.
  status: StatusStore;
  // What the chosen assistant last pushed as the place the next message
  // lands, shown above the prompt bar.
  destination: DestinationStore;
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
}

// Everything held under a panel's id that is not in the layout. A panel id is
// never reused, so what these three hold for a closed panel can only be read
// by nothing: keeping any of it keeps it for the session. They are dropped
// together because they are filled together, from the same panel's render
// (PanelHost's `setTitle`, `setCrumbs`, `setTerms`), and PanelHost's unmount
// is where this is called.
export function forgetPanel(services: WorkbenchServices, id: PanelId): void {
  services.titles.forget(id);
  services.crumbs.forget(id);
  services.terms.forget(id);
}

// The placeholder shown before a panel supplies its own title: the plugin's
// title, then the path when there is one worth showing.
export function fallbackTitle(services: WorkbenchServices, panel: Panel | undefined, id: PanelId) {
  if (!panel) return id;
  const plugin = services.source.plugins().find((p) => p.id === panel.plugin);
  const base = plugin?.title ?? panel.plugin;
  return panel.path && panel.path !== '/' ? `${base}: ${panel.path}` : base;
}
