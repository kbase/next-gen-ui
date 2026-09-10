import type { CartItem, CommandCall, Intent, Query, Suggestion } from '../../../plugins/sdk';
import { qualifyCommand } from '../../../plugins/sdk';
import type { Answer, QuerySource, QueryStore } from '../../core';
import type { HostIndex } from '../installed';

// Asking every plugin about a source of terms, and the chosen intent about
// the text.
//
// Each source has its own clock. Setting one runs every `terms` at once —
// they are synchronous and cheap — pools what comes back with the terms
// given, and lets each plugin expand the pool once. The page and cart
// sources then wait for the settle and call every `recommend` with the
// pool; a source set again before the settle restarts it. The typing source
// waits for nothing: every `recommend.commands` is asked on the keystroke,
// and the intent is asked with the offers that came back at once, then
// again as a slower plugin's offer lands. An answer that arrives for a
// question no longer being asked is dropped.
//
// What the reader sees follows the omnibox rule rather than the clear-and-
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
  text?: string;
  terms?: string[];
  // The plugin whose own front tab produced these terms: never asked about
  // them, so a plugin cannot recommend the page it has open.
  owner?: string;
  // What the heading says the answers were computed from.
  label?: string;
}

export interface QueryRunner {
  set: (source: QuerySource, input: QueryInput) => void;
  stop: () => void;
}

export interface RunnerOptions {
  // The intent module Settings names, once loaded. Read on every keystroke,
  // so a change of setting takes effect on the next one.
  intent?: () => Intent | undefined;
}

const sameCall = (a: CommandCall, b: CommandCall) =>
  a.command === b.command &&
  a.label === b.label &&
  JSON.stringify(a.args ?? {}) === JSON.stringify(b.args ?? {});

// The union of two answers from one plugin, for a pool that grew: rows the
// plugin gave for the earlier terms stay, rows for the new terms join them.
function merged(prev: Answer | undefined, next: Answer): Answer {
  if (!prev) return next;
  const commands = [
    ...prev.commands,
    ...next.commands.filter((c) => !prev.commands.some((p) => sameCall(p, c))),
  ];
  const seen = new Set(prev.cartItems.map((i) => i.id));
  const cartItems: CartItem[] = [
    ...prev.cartItems,
    ...next.cartItems.filter((i) => !seen.has(i.id)),
  ];
  return { plugin: next.plugin, commands, cartItems };
}

export function createQueryRunner(
  index: HostIndex,
  store: QueryStore,
  options: RunnerOptions = {},
): QueryRunner {
  const timers = new Map<QuerySource, number>();
  const inflight = new Map<QuerySource, AbortController>();
  let suggesting: AbortController | null = null;
  // The full pool each source was last asked about, to tell a pool that grew
  // from one that changed.
  const asked = new Map<QuerySource, { owner?: string; text?: string; pool: string[] }>();

  // Every plugin's terms for the text, then one pass in which each plugin
  // may expand a term it recognises into others. A `terms` that throws is
  // that plugin's problem: it contributes nothing this round.
  const pool = (input: QueryInput): string[] => {
    const found = new Set(input.terms ?? []);
    const signal = new AbortController().signal;
    const ask = (q: Omit<Query, 'signal'>) => {
      for (const { plugin, background } of index.backgrounds()) {
        if (!background.terms) continue;
        try {
          for (const term of background.terms({ ...q, signal })) found.add(term);
        } catch (err) {
          console.warn(`plugin ${plugin}: its terms() threw; ignoring it`, err);
        }
      }
    };
    if (input.text) ask({ text: input.text });
    const first = [...found];
    if (first.length) ask({ terms: first });
    return [...found];
  };

  // The chosen intent's suggestions for the text, on the keystroke: a sync
  // answer lands at once, an async one when it arrives unless the text has
  // moved on. Until it lands the previous suggestions stay. A `suggest` that
  // throws or rejects is that plugin's problem.
  const suggest = (text: string | undefined, terms: string[], offers: CommandCall[]) => {
    suggesting?.abort();
    const intent = options.intent?.();
    if (!intent || !text) {
      store.set('typing', { ...store.get('typing'), suggestions: [] });
      return;
    }
    const controller = new AbortController();
    suggesting = controller;
    const land = (suggestions: Suggestion[]) => {
      if (controller.signal.aborted) return;
      store.set('typing', { ...store.get('typing'), suggestions });
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

  // The typing source, on the keystroke: every plugin's `commands` at once,
  // then the intent with the offers that came back synchronously. A plugin
  // that answers later lands when it does, and the intent is asked again
  // with the offers so far; nothing waits on a slow plugin. What is typed is
  // answered with commands only: the prompt bar shows them, and the Related
  // pane, which shows items, does not read this source.
  const askTyping = (input: QueryInput, terms: string[]) => {
    inflight.get('typing')?.abort();
    const controller = new AbortController();
    inflight.set('typing', controller);
    const query: Query = { text: input.text, terms, signal: controller.signal };
    const label = input.label ?? input.text ?? '';
    const plugins = index
      .backgrounds()
      .filter(({ plugin, background }) => background.recommend?.commands && plugin !== input.owner);
    const order = new Map(plugins.map(({ plugin }, i) => [plugin, i]));
    const answers = new Map<string, Answer>();
    for (const a of store.get('typing').answers) {
      if (order.has(a.plugin)) answers.set(a.plugin, { ...a, stale: true });
    }
    const pending = new Set(plugins.map(({ plugin }) => plugin));
    let settled = false;
    const publish = () => {
      if (controller.signal.aborted) return;
      store.set('typing', {
        label,
        pool: terms,
        answers: [...answers.values()].sort((a, b) => order.get(a.plugin)! - order.get(b.plugin)!),
        pending: [...pending],
        loading: !settled && pending.size > 0,
        suggestions: store.get('typing').suggestions,
      });
    };
    // The offers in hand for this text: a stale answer is for the last text.
    const offers = (): CommandCall[] =>
      [...answers.values()]
        .filter((a) => !a.stale)
        .flatMap((a) =>
          a.commands.map((c) => ({ ...c, command: qualifyCommand(c.command, a.plugin) })),
        );
    const land = (plugin: string, commands: CommandCall[]) => {
      pending.delete(plugin);
      if (commands.length) answers.set(plugin, { plugin, commands, cartItems: [] });
      else answers.delete(plugin);
    };
    const later: Promise<void>[] = [];
    for (const { plugin, background } of plugins) {
      let result: CommandCall[] | Promise<CommandCall[]>;
      try {
        result = background.recommend!.commands!(query);
      } catch (err) {
        console.warn(`plugin ${plugin}: its recommend() threw; ignoring it`, err);
        land(plugin, []);
        continue;
      }
      if (result instanceof Promise) {
        later.push(
          result.then(
            (commands) => {
              if (controller.signal.aborted) return;
              land(plugin, commands);
              publish();
              suggest(input.text, terms, offers());
            },
            (err: unknown) => {
              if (controller.signal.aborted) return;
              console.warn(`plugin ${plugin}: its recommend() threw; ignoring it`, err);
              land(plugin, []);
              publish();
            },
          ),
        );
      } else {
        land(plugin, result);
      }
    }
    publish();
    suggest(input.text, terms, offers());
    if (pending.size) {
      const budget = window.setTimeout(() => {
        settled = true;
        publish();
      }, BUDGET_MS);
      void Promise.all(later).then(() => {
        window.clearTimeout(budget);
        settled = true;
        publish();
      });
    }
  };

  // `terms` is what the plugins are asked about this round; `pool` is what the
  // heading says. They differ when the pool only grew: the question is the
  // new terms, and its answers join what the plugins already said.
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
    const query: Query = { text: input.text, terms, signal: controller.signal };
    const label = input.label ?? input.text ?? '';
    const plugins = index
      .backgrounds()
      .filter(({ plugin, background }) => background.recommend && plugin !== input.owner);
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
        label,
        pool: fullPool,
        answers: [...answers.values()].sort((a, b) => order.get(a.plugin)! - order.get(b.plugin)!),
        pending: [...pending],
        loading: !settled && pending.size > 0,
        suggestions: store.get(source).suggestions,
      });
    };
    publish();
    const budget = window.setTimeout(() => {
      settled = true;
      publish();
    }, BUDGET_MS);

    await Promise.all(
      plugins.map(async ({ plugin, background }) => {
        const recommend = background.recommend!;
        const call = async <T>(fn: ((q: Query) => T[] | Promise<T[]>) | undefined) => {
          if (!fn) return [] as T[];
          try {
            return await fn(query);
          } catch (err) {
            if (!controller.signal.aborted) {
              console.warn(`plugin ${plugin}: its recommend() threw; ignoring it`, err);
            }
            return [] as T[];
          }
        };
        const [commands, cartItems] = await Promise.all([
          call(recommend.commands),
          call(recommend.cartItems),
        ]);
        if (controller.signal.aborted) return;
        pending.delete(plugin);
        const fresh: Answer = { plugin, commands, cartItems };
        const answer = grow ? merged(answers.get(plugin), fresh) : fresh;
        if (answer.commands.length || answer.cartItems.length) answers.set(plugin, answer);
        else answers.delete(plugin);
        publish();
      }),
    );
    window.clearTimeout(budget);
    settled = true;
    publish();
  };

  return {
    set(source, input) {
      window.clearTimeout(timers.get(source));
      const terms = pool(input);
      const label = input.label ?? input.text ?? '';
      if (terms.length === 0 && !input.text) {
        inflight.get(source)?.abort();
        asked.delete(source);
        store.set(source, { label, pool: [], answers: [], pending: [], loading: false });
        if (source === 'typing') suggest(undefined, [], []);
        return;
      }
      if (source === 'typing') {
        askTyping(input, terms);
        return;
      }
      // A pool that only grew — a page whose terms arrive as it loads, a cart
      // with one more item — is asked about the new terms alone, and the
      // answers join the sections already showing rather than replacing them.
      const before = asked.get(source);
      const grow =
        !!before &&
        before.owner === input.owner &&
        before.text === input.text &&
        before.pool.length > 0 &&
        before.pool.every((t) => terms.includes(t)) &&
        terms.length > before.pool.length;
      const question = grow ? terms.filter((t) => !before!.pool.includes(t)) : terms;
      asked.set(source, { owner: input.owner, text: input.text, pool: terms });
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
    stop() {
      for (const timer of timers.values()) window.clearTimeout(timer);
      for (const controller of inflight.values()) controller.abort();
      suggesting?.abort();
    },
  };
}
