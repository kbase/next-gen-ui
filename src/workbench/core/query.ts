import type { CartItem, Offer, Suggestion } from '../../plugins/sdk';

// What every plugin's `relate` said about each source of terms, and what
// they offered for the text.
//
// The two term sources are asked separately because they change at different
// rates: the front tab's terms and the cart's. The host carries terms and
// never reads one; its jobs are to ask each question once per settle, to drop
// answers to a question no longer being asked, and to remember what the user
// turned down. The text is not a source in that sense — nothing about it
// outlives a keystroke — so its offers are held apart, in `TypingState`.

export type QuerySource = 'page' | 'cart';
export const QUERY_SOURCES: readonly QuerySource[] = ['page', 'cart'];

export interface Answer {
  plugin: string;
  items: CartItem[];
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
}

// One plugin's offers for the text, as it made them. They reach the prompt
// bar only through the intent, which is handed them with each `command`
// qualified and answers with the rows the bar draws.
export interface PluginOffers {
  plugin: string;
  calls: Offer[];
  // Made for the previous text; shown until this plugin answers for the
  // current one.
  stale?: boolean;
}

// What is in hand for the text being typed. No question here outlives a
// keystroke, so there is nothing to wait on and nothing to name.
export interface TypingState {
  // The terms every background found in the text.
  pool: string[];
  // In the registry's plugin order.
  offers: PluginOffers[];
  // What the chosen intent answered for the text, and every row the prompt
  // bar draws under free text. The previous answer stays until the next
  // lands.
  suggestions: Suggestion[];
}

export const EMPTY_SOURCE: SourceState = {
  label: '',
  pool: [],
  answers: [],
  pending: [],
  loading: false,
};

export const EMPTY_TYPING: TypingState = { pool: [], offers: [], suggestions: [] };

// A dismissed recommendation stays gone whoever offers it next: the key is
// the item's own id.

export interface QueryStore {
  get: (source: QuerySource) => SourceState;
  set: (source: QuerySource, state: SourceState) => void;
  typing: () => TypingState;
  setTyping: (state: TypingState) => void;
  dismiss: (key: string) => void;
  dismissed: (key: string) => boolean;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

export function createQueryStore(): QueryStore {
  const states = new Map<QuerySource, SourceState>();
  let typing = EMPTY_TYPING;
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
    typing: () => typing,
    setTyping(state) {
      typing = state;
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
