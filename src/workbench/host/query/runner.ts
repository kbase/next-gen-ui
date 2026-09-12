import type { CartItem, CommandCall, Intent, Suggestion, TermsQuery } from '../../../plugins/sdk';
import { qualifyCommand } from '../../../plugins/sdk';
import type { Answer, PluginOffers, QuerySource, QueryStore } from '../../core';
import { EMPTY_TYPING } from '../../core';
import type { HostIndex } from '../installed';

// Asking every plugin what it offers for the text, what it has about a
// page's or the cart's terms, and the chosen intent about the text.
//
// Two loops, because the two questions run on different clocks and their
// answers go to different places.
//
// Typing: every keystroke runs every `terms` at once — they are synchronous
// and cheap — and asks every `offer` with the text and the pooled terms. The
// intent is asked with the offers that came back at once, then again as a
// slower plugin's offer lands. Nothing here waits: there is no settle and no
// budget, because there is nothing a reader would wait for. The answers are
// the prompt bar's offer rows.
//
// Page and cart: the terms a panel or the cart reports are asked about after
// a settle, and every `relate` is called with them; a source set again before
// the settle restarts it. The answers are items, and Related shows them.
//
// An answer that arrives for a question no longer being asked is dropped.
//
// What Related shows follows the omnibox rule rather than the clear-and-
// refill one: the previous answers stay on screen, marked stale, until each
// plugin's new answer replaces its own section; sections keep the plugin
// order of the registry, so an arrival never moves another plugin's rows;
// and the budget ends the waiting, not the showing — a late answer still
// lands in its section if the question has not moved on.

// Long enough that adding three items to a cart is one round of questions
// rather than three, short enough that the pane does not feel detached from
// what the user just did.
export const SETTLE_MS = 250;

// How long the pane says it is still asking. Past it `loading` clears and the
// stale sections of plugins that have not answered stay dimmed until they do;
// nothing is aborted by time, only by the question changing.
export const BUDGET_MS = 2000;

export interface QueryInput {
  terms: string[];
  // The plugin whose own front tab produced these terms: never asked about
  // them, so a plugin cannot recommend the page it has open.
  owner?: string;
  // What the heading says the answers were computed from.
  label?: string;
}

export interface QueryRunner {
  // What is in the prompt bar, on the keystroke. Empty text withdraws the
  // question.
  typed: (text: string) => void;
  set: (source: QuerySource, input: QueryInput) => void;
  // Renames the heading over the answers already in hand. The label is what
  // the question is called, not part of it, so a tab that titles itself after
  // reporting its terms reaches the pane without restarting the round.
  label: (source: QuerySource, label: string) => void;
  stop: () => void;
}

export interface RunnerOptions {
  // The intent module Settings names, once loaded. Read on every keystroke,
  // so a change of setting takes effect on the next one.
  intent?: () => Intent | undefined;
}

// Two pools are the same question when they hold the same terms. Order is not
// part of the question: `relate` is given a bag of terms and no plugin is told
// which one came first, and the Related pane keeps the order rows first
// appeared (core/recommendations.ts), so asking again in a new order could not
// move a row the reader already has. The cart's newest-first order therefore
// decides which answers arrive first within one round, not whether a round
// runs.
function sameQuestion(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const have = new Set(a);
  return b.every((t) => have.has(t));
}

// The union of two answers from one plugin, for a pool that grew: items the
// plugin gave for the earlier terms stay, items for the new terms join them.
function merged(prev: Answer | undefined, next: Answer): Answer {
  if (!prev) return next;
  const seen = new Set(prev.items.map((i) => i.id));
  const items: CartItem[] = [...prev.items, ...next.items.filter((i) => !seen.has(i.id))];
  return { plugin: next.plugin, items };
}

export function createQueryRunner(
  index: HostIndex,
  store: QueryStore,
  options: RunnerOptions = {},
): QueryRunner {
  const timers = new Map<QuerySource, number>();
  const inflight = new Map<QuerySource, AbortController>();
  let offering: AbortController | null = null;
  let suggesting: AbortController | null = null;
  // The full pool each source was last asked about, to tell a pool that grew
  // from one that changed.
  const asked = new Map<QuerySource, { owner?: string; pool: string[] }>();

  // Every plugin's terms for the text. A `terms` that throws is that
  // plugin's problem: it contributes nothing this round.
  const termsIn = (text: string): string[] => {
    const found = new Set<string>();
    for (const { plugin, background } of index.backgrounds()) {
      if (!background.terms) continue;
      try {
        for (const term of background.terms({ text })) found.add(term);
      } catch (err) {
        console.warn(`plugin ${plugin}: its terms() threw; ignoring it`, err);
      }
    }
    return [...found];
  };

  // The chosen intent's suggestions for the text, on the keystroke: a sync
  // answer lands at once, an async one when it arrives unless the text has
  // moved on. Until it lands the previous suggestions stay. A `suggest` that
  // throws or rejects is that plugin's problem.
  const suggest = (text: string, terms: string[], offers: CommandCall[]) => {
    suggesting?.abort();
    const intent = options.intent?.();
    if (!intent) {
      store.setTyping({ ...store.typing(), suggestions: [] });
      return;
    }
    const controller = new AbortController();
    suggesting = controller;
    const land = (suggestions: Suggestion[]) => {
      if (controller.signal.aborted) return;
      store.setTyping({ ...store.typing(), suggestions });
    };
    const fail = (err: unknown) => {
      if (!controller.signal.aborted)
        console.warn('the intent plugin: its suggest() threw; ignoring it', err);
    };
    try {
      const result = intent.suggest({ text, terms, offers, signal: controller.signal });
      if (result instanceof Promise) result.then(land, fail);
      else land(result);
    } catch (err) {
      fail(err);
    }
  };

  // The typing loop, on the keystroke: every plugin's `offer` at once, then
  // the intent with the offers that came back synchronously. A plugin that
  // answers later lands when it does, and the intent is asked again with the
  // offers so far. Nothing waits on a slow plugin, and nothing announces a
  // wait: the bar shows what it has, and a keystroke away is a new question.
  const offerFor = (text: string, terms: string[]) => {
    offering?.abort();
    const controller = new AbortController();
    offering = controller;
    const query = { text, terms, signal: controller.signal };
    const plugins = index.backgrounds().filter(({ background }) => background.offer);
    const order = new Map(plugins.map(({ plugin }, i) => [plugin, i]));
    // What each plugin last offered stays until it answers for this text.
    const offers = new Map<string, PluginOffers>();
    for (const o of store.typing().offers) {
      if (order.has(o.plugin)) offers.set(o.plugin, { ...o, stale: true });
    }
    const publish = () => {
      if (controller.signal.aborted) return;
      store.setTyping({
        pool: terms,
        offers: [...offers.values()].sort((a, b) => order.get(a.plugin)! - order.get(b.plugin)!),
        suggestions: store.typing().suggestions,
      });
    };
    // The offers in hand for this text: a stale one is for the last text.
    const current = (): CommandCall[] =>
      [...offers.values()]
        .filter((o) => !o.stale)
        .flatMap((o) =>
          o.calls.map((c) => ({ ...c, command: qualifyCommand(c.command, o.plugin) })),
        );
    const land = (plugin: string, calls: CommandCall[]) => {
      if (calls.length) offers.set(plugin, { plugin, calls });
      else offers.delete(plugin);
    };
    for (const { plugin, background } of plugins) {
      let result: CommandCall[] | Promise<CommandCall[]>;
      try {
        result = background.offer!(query);
      } catch (err) {
        console.warn(`plugin ${plugin}: its offer() threw; ignoring it`, err);
        land(plugin, []);
        continue;
      }
      if (result instanceof Promise) {
        void result.then(
          (calls) => {
            if (controller.signal.aborted) return;
            land(plugin, calls);
            publish();
            suggest(text, terms, current());
          },
          (err: unknown) => {
            if (controller.signal.aborted) return;
            console.warn(`plugin ${plugin}: its offer() threw; ignoring it`, err);
            land(plugin, []);
            publish();
          },
        );
      } else {
        land(plugin, result);
      }
    }
    publish();
    suggest(text, terms, current());
  };

  // The page and cart loop. `terms` is what the plugins are asked about this
  // round; `fullPool` is what the heading says. They differ when the pool
  // only grew: the question is the new terms, and its answers join what the
  // plugins already said.
  const ask = async (
    source: QuerySource,
    input: QueryInput,
    terms: string[],
    fullPool: string[],
    grow: boolean,
  ) => {
    inflight.get(source)?.abort();
    const controller = new AbortController();
    inflight.set(source, controller);
    const query: TermsQuery = { terms, signal: controller.signal };
    const plugins = index
      .backgrounds()
      .filter(({ plugin, background }) => background.relate && plugin !== input.owner);
    const order = new Map(plugins.map(({ plugin }, i) => [plugin, i]));

    // Previous answers stay, stale, until each plugin's new one replaces
    // them; an answer from a plugin no longer asked goes now.
    const answers = new Map<string, Answer>();
    for (const a of store.get(source).answers) {
      if (order.has(a.plugin)) answers.set(a.plugin, grow ? a : { ...a, stale: true });
    }
    const pending = new Set(plugins.map(({ plugin }) => plugin));
    let settled = false;
    const publish = () => {
      if (controller.signal.aborted) return;
      store.set(source, {
        // Whatever the source is called now: `set` wrote a label before the
        // settle, and `label` may have replaced it while this round waited.
        label: store.get(source).label,
        pool: fullPool,
        answers: [...answers.values()].sort((a, b) => order.get(a.plugin)! - order.get(b.plugin)!),
        pending: [...pending],
        loading: !settled && pending.size > 0,
      });
    };
    publish();
    const budget = window.setTimeout(() => {
      settled = true;
      publish();
    }, BUDGET_MS);

    await Promise.all(
      plugins.map(async ({ plugin, background }) => {
        let items: CartItem[];
        try {
          items = await background.relate!(query);
        } catch (err) {
          if (!controller.signal.aborted) {
            console.warn(`plugin ${plugin}: its relate() threw; ignoring it`, err);
          }
          items = [];
        }
        if (controller.signal.aborted) return;
        pending.delete(plugin);
        const fresh: Answer = { plugin, items };
        const answer = grow ? merged(answers.get(plugin), fresh) : fresh;
        if (answer.items.length) answers.set(plugin, answer);
        else answers.delete(plugin);
        publish();
      }),
    );
    window.clearTimeout(budget);
    settled = true;
    publish();
  };

  // The heading over the answers already in hand.
  const relabel = (source: QuerySource, label: string) => {
    const state = store.get(source);
    if (state.label === label) return;
    store.set(source, { ...state, label });
  };

  return {
    typed(text) {
      if (!text) {
        offering?.abort();
        suggesting?.abort();
        store.setTyping(EMPTY_TYPING);
        return;
      }
      offerFor(text, termsIn(text));
    },
    set(source, input) {
      const terms = [...new Set(input.terms)];
      const label = input.label ?? '';
      const before = asked.get(source);
      // The question already asked, put again: the same terms in any order,
      // from the same owner. Nothing to ask — the answers in hand are the
      // answers to it, and a round still settling or in flight is this round.
      // Only the heading can have moved.
      if (before && before.owner === input.owner && sameQuestion(before.pool, terms)) {
        relabel(source, label);
        return;
      }
      window.clearTimeout(timers.get(source));
      if (terms.length === 0) {
        inflight.get(source)?.abort();
        asked.delete(source);
        store.set(source, { label, pool: [], answers: [], pending: [], loading: false });
        return;
      }
      // A pool that only grew — a page whose terms arrive as it loads, a cart
      // with one more item — is asked about the new terms alone, and the
      // answers join the sections already showing rather than replacing them.
      // Every old term still present makes this a growth: the equal pool left
      // above, so terms holds something the pool did not.
      const grow =
        !!before &&
        before.owner === input.owner &&
        before.pool.length > 0 &&
        before.pool.every((t) => terms.includes(t));
      const question = grow ? terms.filter((t) => !before!.pool.includes(t)) : terms;
      asked.set(source, { owner: input.owner, pool: terms });
      const prev = store.get(source);
      store.set(source, {
        ...prev,
        label,
        pool: terms,
        answers: grow ? prev.answers : prev.answers.map((a) => ({ ...a, stale: true })),
        loading: true,
      });
      timers.set(
        source,
        window.setTimeout(() => void ask(source, input, question, terms, grow), SETTLE_MS),
      );
    },
    label(source, label) {
      relabel(source, label);
    },
    stop() {
      for (const timer of timers.values()) window.clearTimeout(timer);
      for (const controller of inflight.values()) controller.abort();
      offering?.abort();
      suggesting?.abort();
    },
  };
}
