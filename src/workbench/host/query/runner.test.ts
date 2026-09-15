import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Background,
  CartItem,
  IntentQuery,
  Offer,
  Suggestion,
  TermsQuery,
  TypedQuery,
} from '@kbase/plugin-sdk';
import { createQueryStore, mergeRecommendations } from '../../core';
import type { HostIndex } from '../installed';
import { BUDGET_MS, SETTLE_MS, createQueryRunner } from './runner';

// The runner over a stand-in index: only `backgrounds()` is consulted.
function index(backgrounds: Record<string, Background>): HostIndex {
  return {
    backgrounds: () =>
      Object.entries(backgrounds).map(([plugin, background]) => ({
        plugin,
        title: plugin,
        background,
      })),
  } as unknown as HostIndex;
}

const accessions = (terms: string[]) =>
  terms.filter((t) => t.startsWith('uniprot:')).map((t) => t.slice(8));

const fj: Background = {
  terms: ({ text }) => (/^[A-Z][0-9][A-Z0-9]{3}[0-9]$/.test(text) ? [`uniprot:${text}`] : []),
  offer: ({ terms }) =>
    accessions(terms).map((id) => ({
      label: `Dossier for ${id}`,
      command: 'open',
      args: { q: id },
      match: { term: `uniprot:${id}`, kind: 'identifier' as const },
    })),
  relate: async ({ terms }) =>
    accessions(terms).map((id) => ({
      id: `fj:protein:${id}`,
      name: id,
      source: { command: 'open', args: { q: id } },
    })),
};

// A second tagger, so the pool is more than one plugin's answer.
const tagger: Background = {
  terms: ({ text }) => (text === 'P0AEX9' ? ['taxon:83333'] : []),
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the typing loop', () => {
  it('pools the terms every plugin found in the text, and asks offer on the keystroke', () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj, tagger }), store);
    runner.typed('P0AEX9');
    expect(store.typing().pool).toEqual(['uniprot:P0AEX9', 'taxon:83333']);
    // A synchronous answer is in hand before typed() returns.
    const [offer] = store.typing().offers;
    expect(offer.plugin).toBe('fj');
    expect(offer.calls.map((c) => c.label)).toEqual(['Dossier for P0AEX9']);
  });

  it('asks each terms() once, with the text alone', () => {
    const terms = vi.fn<(q: { text: string }) => string[]>(() => ['a:1']);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { terms } }), store);
    runner.typed('P0AEX9');
    expect(terms).toHaveBeenCalledTimes(1);
    expect(terms.mock.calls[0][0]).toEqual({ text: 'P0AEX9' });
  });

  // Typed text waits for nothing: each keystroke asks, and the signal drops
  // an answer for text that has moved on.
  it('asks on every keystroke and drops an answer for older text', async () => {
    let release: ((c: Offer[]) => void) | undefined;
    const offer = vi.fn<(q: TypedQuery) => Promise<Offer[]>>(
      () => new Promise((resolve) => (release = resolve)),
    );
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { offer } }), store);
    runner.typed('a');
    const first = release!;
    runner.typed('ab');
    expect(offer).toHaveBeenCalledTimes(2);
    const match = { term: 'a:1', kind: 'identifier' as const };
    first([{ label: 'for a', command: 'x', match }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.typing().offers).toEqual([]);
    release!([{ label: 'for ab', command: 'x', match }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.typing().offers[0].calls[0].label).toBe('for ab');
  });

  it('keeps the previous offers of a plugin, dimmed, until it answers for the new text', async () => {
    let release: (() => void) | undefined;
    let calls = 0;
    const p: Background = {
      offer: ({ text }) => {
        const call = {
          label: `for ${text}`,
          command: 'x',
          match: { term: 'a:1', kind: 'name' as const },
        };
        return new Promise<Offer[]>((resolve) => {
          calls += 1;
          if (calls === 1) resolve([call]);
          else release = () => resolve([call]);
        });
      },
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p }), store);
    runner.typed('a');
    await vi.advanceTimersByTimeAsync(0);
    expect(store.typing().offers[0].calls[0].label).toBe('for a');
    runner.typed('ab');
    expect(store.typing().offers[0]).toMatchObject({ stale: true });
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.typing().offers[0].stale).toBeUndefined();
    expect(store.typing().offers[0].calls[0].label).toBe('for ab');
  });

  // What the reader can act on is shown as it arrives; a plugin still
  // working is not announced, because the next keystroke replaces the
  // question anyway.
  it('shows the offers of a fast plugin while a slow one is still working', async () => {
    let release: (() => void) | undefined;
    const slow: Background = {
      offer: () =>
        new Promise<Offer[]>((resolve) => {
          release = () =>
            resolve([{ label: 'late', command: 'x', match: { term: 'a:1', kind: 'name' } }]);
        }),
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ slow, fj }), store);
    runner.typed('P0AEX9');
    expect(store.typing().offers.map((o) => o.plugin)).toEqual(['fj']);
    await vi.advanceTimersByTimeAsync(BUDGET_MS);
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    // Registry order, not arrival order.
    expect(store.typing().offers.map((o) => o.plugin)).toEqual(['slow', 'fj']);
  });

  it('never asks a plugin for items about what is being typed', () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => []);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj, p: { relate } }), store);
    runner.typed('P0AEX9');
    expect(relate).not.toHaveBeenCalled();
  });

  it('withdraws the question when the text goes', () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.typed('P0AEX9');
    expect(store.typing().offers).toHaveLength(1);
    runner.typed('');
    expect(store.typing()).toEqual({ pool: [], offers: [], suggestions: [] });
  });

  it('a terms() or offer() that throws costs that plugin its answer, not the round', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken: Background = {
      terms: () => {
        throw new Error('no');
      },
      offer: () => Promise.reject(new Error('no')),
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ broken, fj }), store);
    runner.typed('P0AEX9');
    expect(store.typing().offers.map((o) => o.plugin)).toEqual(['fj']);
  });
});

describe('the page and cart loop', () => {
  it('asks for items after the settle', async () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'], label: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    const [answer] = store.get('page').answers;
    expect(answer.items.map((i) => i.id)).toEqual(['fj:protein:P0AEX9']);
  });

  // K3: the page and the cart ask what else exists, and an action is not a
  // thing that exists. Whatever a plugin would do with typed text is not
  // asked for here, because nothing shows it.
  it("never asks a plugin what it would do with a page's or the cart's terms", async () => {
    const offer = vi.fn<(q: TypedQuery) => Offer[]>(() => []);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { offer, relate: () => [] } }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'] });
    runner.set('cart', { terms: ['uniprot:P0AEX9'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(offer).not.toHaveBeenCalled();
  });

  it('never sends a plugin the terms of its own front tab', async () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'], owner: 'fj', label: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('page').answers).toEqual([]);
    expect(store.get('page').label).toBe('P0AEX9');
  });

  it('a page set again before the settle asks once, about the newer terms', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => []);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { relate } }), store);
    runner.set('page', { terms: ['a:1'] });
    runner.set('page', { terms: ['b:2'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(relate).toHaveBeenCalledTimes(1);
    expect(relate.mock.calls[0][0]).toMatchObject({ terms: ['b:2'] });
  });

  it('clears a source that has nothing to ask about', async () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('page').answers).toHaveLength(1);
    runner.set('page', { terms: [] });
    expect(store.get('page')).toMatchObject({ pool: [], answers: [], loading: false });
  });

  it('shows a fast answer while a slow plugin is still working, and lands the slow one after the budget', async () => {
    let release: (() => void) | undefined;
    const slow: Background = {
      relate: () =>
        new Promise<CartItem[]>((resolve) => {
          release = () => resolve([{ id: 'slow:late', name: 'late' }]);
        }),
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ slow, fj }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('page').answers.map((a) => a.plugin)).toEqual(['fj']);
    expect(store.get('page').pending).toEqual(['slow']);
    expect(store.get('page').loading).toBe(true);
    await vi.advanceTimersByTimeAsync(BUDGET_MS);
    // The pane stops saying it is asking; the question is still open.
    expect(store.get('page').loading).toBe(false);
    expect(store.get('page').pending).toEqual(['slow']);
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    // Registry order, not arrival order.
    expect(store.get('page').answers.map((a) => a.plugin)).toEqual(['slow', 'fj']);
    expect(store.get('page').pending).toEqual([]);
  });

  it('keeps the previous answers, dimmed, until each plugin answers the new question', async () => {
    let release: (() => void) | undefined;
    let calls = 0;
    const p: Background = {
      relate: ({ terms }) =>
        new Promise<CartItem[]>((resolve) => {
          calls += 1;
          const items = [{ id: `p:${terms[0]}`, name: terms[0] }];
          if (calls === 1) resolve(items);
          else release = () => resolve(items);
        }),
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p }), store);
    runner.set('page', { terms: ['a:1'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('page').answers[0].items[0].id).toBe('p:a:1');
    runner.set('page', { terms: ['b:2'] });
    // Before and after the settle the old answer is still there, marked stale.
    expect(store.get('page').answers[0]).toMatchObject({ stale: true });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('page').answers[0]).toMatchObject({ stale: true });
    expect(store.get('page').answers[0].items[0].id).toBe('p:a:1');
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.get('page').answers[0].stale).toBeUndefined();
    expect(store.get('page').answers[0].items[0].id).toBe('p:b:2');
  });

  it('a pool that only grew is asked about the new terms, and the answers merge', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(({ terms }) =>
      terms.map((t) => ({ id: `p:${t}`, name: t })),
    );
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { relate } }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'], label: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    runner.set('page', { terms: ['uniprot:P0AEX9', 'taxon:83333'], label: 'P0AEX9' });
    expect(store.get('page').answers[0].stale).toBeUndefined();
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(relate.mock.calls[1][0].terms).toEqual(['taxon:83333']);
    expect(store.get('page').answers[0].items.map((i) => i.id)).toEqual([
      'p:uniprot:P0AEX9',
      'p:taxon:83333',
    ]);
    expect(store.get('page').pool).toEqual(['uniprot:P0AEX9', 'taxon:83333']);
  });

  // K75. The plugin is asked about the added term alone, so the genome it
  // answers with arrives a second time, under that term and no other. Keeping
  // the copy already shown and dropping the new one left the row saying the
  // cart holds P11558 and never that it also holds the taxon.
  it('a cart that gains a term leaves the item answering both', async () => {
    const genome = (term: string): CartItem => ({
      id: 'gk:genome:511145',
      name: 'E. coli K-12 MG1655',
      answers: [{ term, kind: 'record' }],
    });
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(({ terms }) => terms.map(genome));
    const store = createQueryStore();
    const runner = createQueryRunner(index({ gk: { relate } }), store);
    runner.set('cart', { terms: ['uniprot:P11558'], label: '1 item' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    runner.set('cart', { terms: ['uniprot:P11558', 'ncbitaxon:562'], label: '2 items' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(relate.mock.calls[1][0].terms).toEqual(['ncbitaxon:562']);
    const items = store.get('cart').answers[0].items;
    expect(items.map((i) => i.id)).toEqual(['gk:genome:511145']);
    expect(items[0].answers).toEqual([
      { term: 'uniprot:P11558', kind: 'record' },
      { term: 'ncbitaxon:562', kind: 'record' },
    ]);
    // The sentence the Related row is built from, from the same answers.
    const rows = mergeRecommendations([], [{ source: 'cart', state: store.get('cart') }]);
    expect(rows[0].offeredBy[0].answers.map((a) => a.term)).toEqual([
      'uniprot:P11558',
      'ncbitaxon:562',
    ]);
  });

  // K70: the third case, beside a pool that grew and a question that changed.
  it('the same terms put again ask nobody and leave the rows alone', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(({ terms }) =>
      terms.map((t) => ({ id: `p:${t}`, name: t })),
    );
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { relate } }), store);
    runner.set('page', { terms: ['a:1', 'b:2'], label: 'A' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    const shown = store.get('page');
    runner.set('page', { terms: ['a:1', 'b:2'], label: 'A' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS + BUDGET_MS);
    expect(relate).toHaveBeenCalledTimes(1);
    // Not a row moved, dimmed or reloaded: the state is the one on screen.
    expect(store.get('page')).toBe(shown);
  });

  // The cart orders its terms newest-first (react/useAmbientQueries.ts), and
  // no `relate` reads that order: a reorder is the same question.
  it('the same terms in a new order ask nobody', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => []);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { relate } }), store);
    runner.set('cart', { terms: ['a:1', 'b:2'], label: '2 items' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    runner.set('cart', { terms: ['b:2', 'a:1'], label: '2 items' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(relate).toHaveBeenCalledTimes(1);
    expect(store.get('cart').pool).toEqual(['a:1', 'b:2']);
  });

  // The identical question during the settle is the one already waiting, not
  // a reason to start the wait over.
  it('the same terms put again before the settle do not restart it', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => []);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { relate } }), store);
    runner.set('page', { terms: ['a:1'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS - 50);
    runner.set('page', { terms: ['a:1'] });
    await vi.advanceTimersByTimeAsync(50);
    expect(relate).toHaveBeenCalledTimes(1);
  });

  it('the same terms under a new name rename the heading and ask nobody', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => [{ id: 'p:row', name: 'row' }]);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { relate } }), store);
    runner.set('page', { terms: ['a:1'], label: '/protein/P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    runner.set('page', { terms: ['a:1'], label: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(relate).toHaveBeenCalledTimes(1);
    expect(store.get('page').label).toBe('P0AEX9');
    expect(store.get('page').answers[0].stale).toBeUndefined();
    expect(store.get('page').answers[0].items.map((i) => i.id)).toEqual(['p:row']);
  });

  // A different panel with the same terms is a different question: its own
  // plugin is the one left out.
  it('the same terms from a new owner are a new question', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => []);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { relate }, q: { relate } }), store);
    runner.set('page', { terms: ['a:1'], owner: 'p' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    runner.set('page', { terms: ['a:1'], owner: 'q' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(relate).toHaveBeenCalledTimes(2);
  });

  it('a new label renames the heading and asks nobody, during the settle and after it', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => [{ id: 'p:row', name: 'row' }]);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { relate } }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'], label: '/protein/P0AEX9' });
    runner.label('page', 'P0AEX9');
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    // The settle publishes the name the source has now, not the one `set` held.
    expect(store.get('page').label).toBe('P0AEX9');
    runner.label('page', 'P0AEX9 · Structure');
    expect(store.get('page').label).toBe('P0AEX9 · Structure');
    expect(relate).toHaveBeenCalledTimes(1);
    expect(store.get('page').answers[0].stale).toBeUndefined();
  });

  it('a relate() that throws costs that plugin its answer, not the round', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken: Background = { relate: () => Promise.reject(new Error('no')) };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ broken, fj }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('page').answers.map((a) => a.plugin)).toEqual(['fj']);
  });
});

describe('the chosen intent', () => {
  const suggestion = (label: string) => ({
    call: { label, command: 'jobs:cancel', args: { id: '12' } },
    score: 0.5,
  });

  it('is asked on the keystroke and a sync answer lands at once', () => {
    const store = createQueryStore();
    const intent = { index: vi.fn(), suggest: vi.fn(() => [suggestion('Cancel a job: 12')]) };
    const runner = createQueryRunner(index({ fj }), store, { intent: () => intent });
    runner.typed('cancel job 12');
    expect(intent.suggest).toHaveBeenCalledTimes(1);
    expect(intent.suggest).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'cancel job 12',
        terms: { typed: [], page: [], cart: [] },
        offers: [],
      }),
    );
    expect(store.typing().suggestions.map((s) => s.call.label)).toEqual(['Cancel a job: 12']);
  });

  it('keeps the previous answer until an async one lands, and drops one for older text', async () => {
    const store = createQueryStore();
    let resolveFirst!: (s: ReturnType<typeof suggestion>[]) => void;
    const answers = [
      new Promise<ReturnType<typeof suggestion>[]>((r) => (resolveFirst = r)),
      Promise.resolve([suggestion('second')]),
    ];
    const intent = { index: vi.fn(), suggest: vi.fn(() => answers.shift()!) };
    const runner = createQueryRunner(index({ fj }), store, { intent: () => intent });
    runner.typed('cancel');
    expect(store.typing().suggestions).toEqual([]);
    runner.typed('cancel job');
    await Promise.resolve();
    expect(store.typing().suggestions.map((s) => s.call.label)).toEqual(['second']);
    resolveFirst([suggestion('first')]);
    await Promise.resolve();
    expect(store.typing().suggestions.map((s) => s.call.label)).toEqual(['second']);
  });

  it('is not asked without an intent, and a throwing one contributes nothing', () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.typed('cancel');
    expect(store.typing().suggestions).toEqual([]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = {
      index: vi.fn(),
      suggest: () => {
        throw new Error('no');
      },
    };
    const other = createQueryRunner(index({ fj }), createQueryStore(), { intent: () => broken });
    expect(() => other.typed('cancel')).not.toThrow();
    warn.mockRestore();
  });

  it('is given the offers in hand, qualified, and asked again when a slow one lands', async () => {
    let release: (() => void) | undefined;
    const slow: Background = {
      offer: () =>
        new Promise<Offer[]>((resolve) => {
          release = () =>
            resolve([
              {
                label: 'late',
                command: 'x',
                args: { q: 'P0AEX9' },
                match: { term: 'uniprot:P0AEX9', kind: 'identifier' },
              },
            ]);
        }),
    };
    const store = createQueryStore();
    const intent = { index: vi.fn(), suggest: vi.fn<(q: IntentQuery) => Suggestion[]>(() => []) };
    const runner = createQueryRunner(index({ fj, slow }), store, { intent: () => intent });
    runner.typed('P0AEX9');
    expect(intent.suggest).toHaveBeenCalledTimes(1);
    expect(intent.suggest.mock.calls[0][0].offers).toEqual([
      {
        label: 'Dossier for P0AEX9',
        command: 'fj:open',
        args: { q: 'P0AEX9' },
        match: { term: 'uniprot:P0AEX9', kind: 'identifier' },
      },
    ]);
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(intent.suggest).toHaveBeenCalledTimes(2);
    expect(intent.suggest.mock.calls[1][0].offers?.map((o) => o.command)).toEqual([
      'fj:open',
      'slow:x',
    ]);
  });

  it('is cleared with the text', () => {
    const store = createQueryStore();
    const intent = { index: vi.fn(), suggest: () => [suggestion('x')] };
    const runner = createQueryRunner(index({ fj }), store, { intent: () => intent });
    runner.typed('cancel');
    runner.typed('');
    expect(store.typing().suggestions).toEqual([]);
  });

  // T1: the intent is the one module asked about what the user has in view.
  it('is given the page and the cart under their own tiers', () => {
    const store = createQueryStore();
    const intent = { index: vi.fn(), suggest: vi.fn<(q: IntentQuery) => Suggestion[]>(() => []) };
    const runner = createQueryRunner(index({ fj }), store, { intent: () => intent });
    runner.set('page', { terms: ['ncbitaxon:562'] });
    runner.set('cart', { terms: ['uniprot:P0AEX9'] });
    runner.typed('dossier');
    expect(intent.suggest.mock.calls.at(-1)![0].terms).toEqual({
      typed: [],
      page: ['ncbitaxon:562'],
      cart: ['uniprot:P0AEX9'],
    });
  });

  // The cart moves under text already in the bar, and no keystroke follows:
  // the rows are stale until the intent is asked again, and asking costs
  // nothing, since no plugin is in this round.
  it('is asked again when the cart moves under typed text', () => {
    const store = createQueryStore();
    const offer = vi.fn<(q: TypedQuery) => Offer[]>(() => []);
    const intent = { index: vi.fn(), suggest: vi.fn<(q: IntentQuery) => Suggestion[]>(() => []) };
    const runner = createQueryRunner(index({ p: { offer } }), store, { intent: () => intent });
    runner.typed('dossier');
    expect(intent.suggest).toHaveBeenCalledTimes(1);
    runner.set('cart', { terms: ['uniprot:P0AEX9'] });
    expect(intent.suggest).toHaveBeenCalledTimes(2);
    expect(intent.suggest.mock.calls[1][0]).toMatchObject({
      text: 'dossier',
      terms: { typed: [], page: [], cart: ['uniprot:P0AEX9'] },
    });
    expect(offer).toHaveBeenCalledTimes(1);
  });

  it('is not asked about a cart that moves with nothing typed', () => {
    const store = createQueryStore();
    const intent = { index: vi.fn(), suggest: vi.fn<(q: IntentQuery) => Suggestion[]>(() => []) };
    const runner = createQueryRunner(index({ fj }), store, { intent: () => intent });
    runner.set('cart', { terms: ['uniprot:P0AEX9'] });
    runner.typed('dossier');
    runner.typed('');
    runner.set('cart', { terms: [] });
    expect(intent.suggest).toHaveBeenCalledTimes(1);
  });
});

// A plugin that answers with the wrong shape is contained the way one that
// throws is: the item is refused where it arrives, with a line naming the
// plugin and the field, and the rest of its answer stands.
describe('what a plugin answers is checked where it arrives', () => {
  it('keeps the items relate() answered with that parse and refuses the rest', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createQueryStore();
    const p: Background = {
      relate: async () => [
        { id: 'p:1', name: 'One', source: { command: 'open' } },
        { id: 'p:2', name: 'Two', source: { path: '/two' } } as unknown as CartItem,
      ],
    };
    const runner = createQueryRunner(index({ p }), store);
    runner.set('cart', { terms: ['x:1'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('cart').answers.map((a) => a.items.map((i) => i.id))).toEqual([['p:1']]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^plugin p: an item relate\(\) answered with — source\.command/),
    );
    warn.mockRestore();
  });
});
