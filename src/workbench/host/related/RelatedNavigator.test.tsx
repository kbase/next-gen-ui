import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Background, CartItem, PanelHandle, TermsQuery } from '../../../plugins/sdk';
import { HostContext, PanelContext, definePluginManifest } from '../../../plugins/sdk';
import { makeRoute } from '../../core';
import { ServicesContext } from '../../react/context';
import { useAmbientQueries } from '../../react/useAmbientQueries';
import { createWorkbench, pluginHostFor } from '../createWorkbench';
import { noPersistence } from '../persistence';
import { localPlugin } from '../local';
import { BUDGET_MS, SETTLE_MS } from '../query/runner';
import { RelatedNavigator } from './RelatedNavigator';

// What the pane says before it has answers: nothing has been asked, a section
// is still being answered, a section settled with nothing, a section has rows.
// Every wait here is a settle or a budget the runner defines; none of it is
// the pane's own clock, because the pane no longer has one.

const page = makeRoute('fj', '/protein/P0AEX9', 'a');

const item = (id: string): CartItem => ({ id, name: id, source: { path: `/${id}` } });

// Enough of a panel for `usePanelTitle`; the pane is a block, and the host
// gives every block one of these.
const panel: PanelHandle = {
  id: 'related-1',
  plugin: 'related',
  kind: 'pane',
  path: '',
  focused: false,
  navigate: () => {},
  setTitle: () => {},
  setCrumbs: () => {},
  setTerms: () => {},
  subscribe: () => () => {},
};

function Ambient() {
  useAmbientQueries();
  return null;
}

// The installed plugin's answers, one promise per question, resolved by hand:
// the interval between a question and its answer is what these tests are about.
function plugin() {
  const waiting = new Map<string, (items: CartItem[]) => void>();
  const relate = (q: TermsQuery) =>
    new Promise<CartItem[]>((resolve) => waiting.set(q.terms.join(','), resolve));
  const answer = async (terms: string, items: CartItem[]) => {
    const resolve = waiting.get(terms);
    if (!resolve) throw new Error(`nobody was asked about ${terms}`);
    await act(async () => {
      resolve(items);
      await vi.advanceTimersByTimeAsync(0);
    });
  };
  return { relate, answer };
}

async function mount(relate: (q: TermsQuery) => Promise<CartItem[]>) {
  const services = createWorkbench({
    installed: [
      localPlugin({
        config: definePluginManifest({
          id: 'gk',
          title: 'genKnown',
          description: 'A plugin that answers about proteins.',
          icon: 'Code',
        }),
        background: () => Promise.resolve({ relate } satisfies Background),
      }),
    ],
    persistence: noPersistence,
  });
  // The background module arrives on a microtask; a question asked before it
  // does is asked of nobody.
  await act(async () => {});

  const tree = (children: ReactNode) => (
    <ServicesContext value={services}>
      <PanelContext value={panel}>
        <HostContext value={pluginHostFor(services, 'gk')}>{children}</HostContext>
      </PanelContext>
    </ServicesContext>
  );
  render(
    tree(
      <>
        <Ambient />
        <RelatedNavigator />
      </>,
    ),
  );
  return services;
}

const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

const asking = () => screen.queryAllByText('Asking the other plugins…');
const paneEmpty = () => screen.queryByText('No terms from the open page or the cart.');

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the Related pane before it has answers', () => {
  // A framed page posts its terms a second or two after its tab opens. Until
  // it does, the pane knows only that it has no terms, and must not report an
  // outcome for a question nobody has been asked.
  it('gives no outcome for a page that has not reported its terms yet', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
    });

    // Longer than any quiet period the pane ever kept.
    await wait(SETTLE_MS + BUDGET_MS);
    expect(screen.queryByText(/Nothing offered/)).toBeNull();
    expect(screen.queryByText(/offers anything/)).toBeNull();
    expect(screen.queryByText(page.path)).toBeNull();
    expect(paneEmpty()).toBeInTheDocument();

    // The terms arrive, and the section is up before the settle has run.
    await act(async () => {
      services.terms.set(page.id, ['uniprot:P0AEX9']);
    });
    expect(screen.getByText(page.path)).toBeInTheDocument();
    expect(paneEmpty()).toBeNull();

    await wait(SETTLE_MS);
    expect(asking()).toHaveLength(1);
    await gk.answer('uniprot:P0AEX9', [item('gk:P0AEX9')]);
    expect(screen.getByText('gk:P0AEX9')).toBeInTheDocument();
    expect(asking()).toHaveLength(0);
  });

  it('waits under the heading, without skeleton rows, while the plugins answer', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['uniprot:P0AEX9']);
    });
    await wait(SETTLE_MS);

    expect(screen.getByText(page.path)).toBeInTheDocument();
    expect(asking()).toHaveLength(1);
    // The waiting is a line, not shapes standing in for rows.
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByLabelText('Asking the other plugins')).toBeNull();
  });

  it('says once, quietly, that a settled question offered nothing', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['uniprot:P0AEX9']);
    });
    await wait(SETTLE_MS);
    await gk.answer('uniprot:P0AEX9', []);

    expect(screen.getByText(page.path)).toBeInTheDocument();
    expect(screen.getByText('Nothing offered for the open page.')).toBeInTheDocument();
    expect(asking()).toHaveLength(0);
    // The outcome belongs to the section; the pane says nothing over it.
    expect(paneEmpty()).toBeNull();
  });

  it('reports the pane empty only while neither source has terms', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    expect(paneEmpty()).toBeInTheDocument();

    await act(async () => {
      services.cart.add({ ...item('gk:83333'), terms: ['taxon:83333'], plugin: 'gk', addedAt: 1 });
    });
    await wait(SETTLE_MS);
    expect(paneEmpty()).toBeNull();
    expect(screen.getByText('Cart')).toBeInTheDocument();
  });
});

describe('the Related pane while answers land', () => {
  // Sections that came and went as their answers arrived moved the headings
  // and the rows under the reader. Each goes up with its question and is the
  // same element afterwards.
  it('holds every section in place from its question to its answer', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['uniprot:P0AEX9']);
      services.cart.add({ ...item('gk:83333'), terms: ['taxon:83333'], plugin: 'gk', addedAt: 1 });
    });
    await wait(SETTLE_MS);

    const headings = () => [screen.getByText(page.path), screen.getByText('Cart')];
    const first = headings();
    expect(asking()).toHaveLength(2);

    // The page answers; the cart's question is still outstanding.
    await gk.answer('uniprot:P0AEX9', [item('gk:P0AEX9')]);
    expect(headings()).toEqual(first);
    expect(screen.getByText('gk:P0AEX9')).toBeInTheDocument();
    expect(asking()).toHaveLength(1);

    // The cart answers with nothing: its section stays and says so.
    await gk.answer('taxon:83333', []);
    expect(headings()).toEqual(first);
    expect(screen.getByText('gk:P0AEX9')).toBeInTheDocument();
    expect(screen.getByText('Nothing offered for the cart.')).toBeInTheDocument();
    expect(asking()).toHaveLength(0);
  });
});
