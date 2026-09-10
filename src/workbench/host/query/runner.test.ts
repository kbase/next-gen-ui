import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Background, CommandCall, Query, Suggestion } from '../../../plugins/sdk';
import { createQueryStore } from '../../core';
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

const fj: Background = {
  terms: ({ text, terms }) => {
    if (text && /^[A-Z][0-9][A-Z0-9]{3}[0-9]$/.test(text)) return [`uniprot:${text}`];
    // Expansion: a protein implies its taxon.
    return (terms ?? []).flatMap((t) => (t === 'uniprot:P0AEX9' ? ['taxon:83333'] : []));
  },
  recommend: {
    commands: ({ terms }) =>
      (terms ?? [])
        .filter((t) => t.startsWith('uniprot:'))
        .map((t) => ({
          label: `Dossier for ${t.slice(8)}`,
          command: 'open',
          args: { q: t.slice(8) },
        })),
    cartItems: async ({ terms }) =>
      (terms ?? [])
        .filter((t) => t.startsWith('taxon:'))
        .map((t) => ({ id: `fj:${t}`, kind: 'taxon', name: t, source: { path: `/${t}` } })),
  },
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the query runner', () => {
  it('pools terms at once, expands them once, and asks recommend on the keystroke', () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('typing', { text: 'P0AEX9' });
    expect(store.get('typing').pool).toEqual(['uniprot:P0AEX9', 'taxon:83333']);
    // A synchronous answer is in hand before set() returns.
    const [answer] = store.get('typing').answers;
    expect(answer.plugin).toBe('fj');
    expect(answer.commands.map((c) => c.label)).toEqual(['Dossier for P0AEX9']);
    // What is typed is answered with commands only; items are never asked for.
    expect(answer.cartItems).toEqual([]);
    expect(store.get('typing').loading).toBe(false);
  });

  it('asks for items on the sources the Related pane reads', async () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'], label: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    const [answer] = store.get('page').answers;
    expect(answer.cartItems.map((i) => i.id)).toEqual(['fj:taxon:83333']);
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
    const commands = vi.fn<(q: Query) => CommandCall[]>(() => []);
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { recommend: { commands } } }), store);
    runner.set('page', { terms: ['a:1'] });
    runner.set('page', { terms: ['b:2'] });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(commands).toHaveBeenCalledTimes(1);
    expect(commands.mock.calls[0][0]).toMatchObject({ terms: ['b:2'] });
  });

  // Typed text waits for nothing: each keystroke asks, and the signal drops
  // an answer for text that has moved on.
  it('typing asks on every keystroke and drops an answer for older text', async () => {
    let release: ((c: CommandCall[]) => void) | undefined;
    const commands = vi.fn<(q: Query) => Promise<CommandCall[]>>(
      () => new Promise((resolve) => (release = resolve)),
    );
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { recommend: { commands } } }), store);
    runner.set('typing', { text: 'a' });
    const first = release!;
    runner.set('typing', { text: 'ab' });
    expect(commands).toHaveBeenCalledTimes(2);
    first([{ label: 'for a', command: 'x' }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.get('typing').answers).toEqual([]);
    release!([{ label: 'for ab', command: 'x' }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.get('typing').answers[0].commands[0].label).toBe('for ab');
  });

  it('clears a source that has nothing to ask about', async () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('typing', { text: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('typing').answers).toHaveLength(1);
    runner.set('typing', { text: '' });
    expect(store.get('typing')).toMatchObject({ pool: [], answers: [], loading: false });
  });

  it('shows a fast answer while a slow plugin is still working, and lands the slow one after the budget', async () => {
    let release: (() => void) | undefined;
    const slow: Background = {
      recommend: {
        commands: () =>
          new Promise<CommandCall[]>((resolve) => {
            release = () => resolve([{ label: 'late', command: 'x' }]);
          }),
      },
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ slow, fj }), store);
    runner.set('typing', { text: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('typing').answers.map((a) => a.plugin)).toEqual(['fj']);
    expect(store.get('typing').pending).toEqual(['slow']);
    expect(store.get('typing').loading).toBe(true);
    await vi.advanceTimersByTimeAsync(BUDGET_MS);
    // The pane stops saying it is asking; the question is still open.
    expect(store.get('typing').loading).toBe(false);
    expect(store.get('typing').pending).toEqual(['slow']);
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    // Registry order, not arrival order.
    expect(store.get('typing').answers.map((a) => a.plugin)).toEqual(['slow', 'fj']);
    expect(store.get('typing').pending).toEqual([]);
  });

  it('keeps the previous answers, dimmed, until each plugin answers the new question', async () => {
    let release: (() => void) | undefined;
    let calls = 0;
    const p: Background = {
      recommend: {
        commands: ({ text }) =>
          new Promise<CommandCall[]>((resolve) => {
            calls += 1;
            if (calls === 1) resolve([{ label: `for ${text}`, command: 'x' }]);
            else release = () => resolve([{ label: `for ${text}`, command: 'x' }]);
          }),
      },
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p }), store);
    runner.set('typing', { text: 'a' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('typing').answers[0].commands[0].label).toBe('for a');
    runner.set('typing', { text: 'ab' });
    // Before and after the settle the old answer is still there, marked stale.
    expect(store.get('typing').answers[0]).toMatchObject({ stale: true });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('typing').answers[0]).toMatchObject({ stale: true });
    expect(store.get('typing').answers[0].commands[0].label).toBe('for a');
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.get('typing').answers[0].stale).toBeUndefined();
    expect(store.get('typing').answers[0].commands[0].label).toBe('for ab');
  });

  it('a pool that only grew is asked about the new terms, and the answers merge', async () => {
    const commands = vi.fn<(q: Query) => CommandCall[]>(({ terms = [] }) =>
      terms.map((t) => ({ label: `open ${t}`, command: 'x', args: { q: t } })),
    );
    const store = createQueryStore();
    const runner = createQueryRunner(index({ p: { recommend: { commands } } }), store);
    runner.set('page', { terms: ['uniprot:P0AEX9'], label: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    runner.set('page', { terms: ['uniprot:P0AEX9', 'taxon:83333'], label: 'P0AEX9' });
    expect(store.get('page').answers[0].stale).toBeUndefined();
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(commands.mock.calls[1][0].terms).toEqual(['taxon:83333']);
    expect(store.get('page').answers[0].commands.map((c) => c.label)).toEqual([
      'open uniprot:P0AEX9',
      'open taxon:83333',
    ]);
    expect(store.get('page').pool).toEqual(['uniprot:P0AEX9', 'taxon:83333']);
  });

  it('a terms() or recommend() that throws costs that plugin its answer, not the round', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken: Background = {
      terms: () => {
        throw new Error('no');
      },
      recommend: { commands: () => Promise.reject(new Error('no')) },
    };
    const store = createQueryStore();
    const runner = createQueryRunner(index({ broken, fj }), store);
    runner.set('typing', { text: 'P0AEX9' });
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(store.get('typing').answers.map((a) => a.plugin)).toEqual(['fj']);
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
    runner.set('typing', { text: 'cancel job 12' });
    expect(intent.suggest).toHaveBeenCalledTimes(1);
    expect(intent.suggest).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'cancel job 12', terms: [], offers: [] }),
    );
    expect(store.get('typing').suggestions?.map((s) => s.call.label)).toEqual(['Cancel a job: 12']);
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
    runner.set('typing', { text: 'cancel' });
    expect(store.get('typing').suggestions).toEqual([]);
    runner.set('typing', { text: 'cancel job' });
    await Promise.resolve();
    expect(store.get('typing').suggestions?.map((s) => s.call.label)).toEqual(['second']);
    resolveFirst([suggestion('first')]);
    await Promise.resolve();
    expect(store.get('typing').suggestions?.map((s) => s.call.label)).toEqual(['second']);
  });

  it('is not asked without an intent, and a throwing one contributes nothing', () => {
    const store = createQueryStore();
    const runner = createQueryRunner(index({ fj }), store);
    runner.set('typing', { text: 'cancel' });
    expect(store.get('typing').suggestions).toEqual([]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = {
      index: vi.fn(),
      suggest: () => {
        throw new Error('no');
      },
    };
    const other = createQueryRunner(index({ fj }), createQueryStore(), { intent: () => broken });
    expect(() => other.set('typing', { text: 'cancel' })).not.toThrow();
    warn.mockRestore();
  });

  it('is given the offers in hand, qualified, and asked again when a slow one lands', async () => {
    let release: (() => void) | undefined;
    const slow: Background = {
      recommend: {
        commands: () =>
          new Promise<CommandCall[]>((resolve) => {
            release = () => resolve([{ label: 'late', command: 'x', args: { q: 'P0AEX9' } }]);
          }),
      },
    };
    const store = createQueryStore();
    const intent = { index: vi.fn(), suggest: vi.fn<(q: Query) => Suggestion[]>(() => []) };
    const runner = createQueryRunner(index({ fj, slow }), store, { intent: () => intent });
    runner.set('typing', { text: 'P0AEX9' });
    expect(intent.suggest).toHaveBeenCalledTimes(1);
    expect(intent.suggest.mock.calls[0][0].offers).toEqual([
      { label: 'Dossier for P0AEX9', command: 'fj:open', args: { q: 'P0AEX9' } },
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
    runner.set('typing', { text: 'cancel' });
    runner.set('typing', { text: '' });
    expect(store.get('typing').suggestions).toEqual([]);
  });
});
