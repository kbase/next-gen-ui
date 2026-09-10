import type { CartItem, CommandCall, Suggestion } from '../../plugins/sdk';

// What every plugin's `recommend` said about each source of terms.
//
// Three sources, asked separately because they change at different rates:
// the text being typed, the front tab's terms, and the cart's. The host
// carries terms and never reads one; its jobs are to ask each question
// once per settle, to drop answers to a question no longer being asked,
// and to remember what the user turned down.

export type QuerySource = 'typing' | 'page' | 'cart';
export const QUERY_SOURCES: readonly QuerySource[] = ['typing', 'page', 'cart'];

export interface Answer {
  plugin: string;
  commands: CommandCall[];
  cartItems: CartItem[];
  // Given for an earlier question; shown dimmed until this plugin answers the
  // current one.
  stale?: boolean;
}

export interface SourceState {
  // What the heading says the answers were computed from.
  label: string;
  pool: string[];
  // In the registry's plugin order, whoever answered first.
  answers: Answer[];
  // Plugins asked the current question that have not answered yet.
  pending: string[];
  // Still within the budget with answers outstanding.
  loading: boolean;
  // What the chosen intent suggested for the text; the typing source only.
  // The previous answer stays until the next lands.
  suggestions?: Suggestion[];
}

export const EMPTY_SOURCE: SourceState = {
  label: '',
  pool: [],
  answers: [],
  pending: [],
  loading: false,
  suggestions: [],
};

// A dismissed recommendation stays gone whoever offers it next: the key is
// the item's own id.

export interface QueryStore {
  get: (source: QuerySource) => SourceState;
  set: (source: QuerySource, state: SourceState) => void;
  dismiss: (key: string) => void;
  dismissed: (key: string) => boolean;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createQueryStore(): QueryStore {
  const states = new Map<QuerySource, SourceState>();
  const gone = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;
  const changed = () => {
    version += 1;
    listeners.forEach((l) => l());
  };
  return {
    get: (source) => states.get(source) ?? EMPTY_SOURCE,
    set(source, state) {
      states.set(source, state);
      changed();
    },
    dismiss(key) {
      gone.add(key);
      changed();
    },
    dismissed: (key) => gone.has(key),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
