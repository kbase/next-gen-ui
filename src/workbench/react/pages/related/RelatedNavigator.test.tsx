import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Background, CartItem, PanelHandle, TermsQuery } from '../../../../plugins/sdk';
import { HostContext, PanelContext, definePluginManifest } from '../../../../plugins/sdk';
import { makeRoute } from '../../../core';
import { ServicesContext } from '../../context';
import { useAmbientQueries } from '../../useAmbientQueries';
import { createWorkbench } from '../../../compose/createWorkbench';
import { pluginHostFor } from '../../../host/pluginHost';
import { noPersistence } from '../../../host/persistence';
import { localPlugin } from '../../../host/local';
import { BUDGET_MS, SETTLE_MS } from '../../../host/query/runner';
import { RelatedNavigator } from './RelatedNavigator';

// What the pane says before it has answers: nothing has been asked, a section
// is still being answered, a section settled with nothing, a section has rows.
// Every wait here is a settle or a budget the runner defines; none of it is
// the pane's own clock, because the pane no longer has one.

const page = makeRoute('fj', '/protein/P0AEX9', 'a');

const item = (id: string): CartItem => ({
  id,
  name: id,
  source: { command: 'open', args: { q: id } },
});

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
  // A question is a bag of terms (host/query/runner.ts), so a test names one
  // by its terms in any order.
  const key = (terms: readonly string[]) => [...terms].sort().join(',');
  const relate = (q: TermsQuery) =>
    new Promise<CartItem[]>((resolve) => waiting.set(key(q.terms), resolve));
  const answer = async (terms: string, items: CartItem[]) => {
    const resolve = waiting.get(key(terms.split(',')));
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
    // Required of every workbench, and inert here: the one plugin installed
    // has neither module, and this pane asks nothing of either.
    defaultAssistant: 'gk',
    defaultIntent: 'gk',
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

// The waiting line names whose rows are still to come, by the plugin's title.
const asking = () => screen.queryAllByText('Nothing yet from genKnown…');
const paneEmpty = () => screen.queryByText('Nothing to show');

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
    expect(screen.queryByText(page.path)).toBeNull();
    expect(paneEmpty()).toBeInTheDocument();

    // The terms arrive. The section goes up when the plugins are asked, which
    // is the first moment it has anything under it to head.
    await act(async () => {
      services.terms.set(page.id, ['uniprot:P0AEX9']);
    });
    await wait(SETTLE_MS);
    expect(screen.getByText(page.path)).toBeInTheDocument();
    expect(paneEmpty()).toBeNull();
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

  // Nobody opened this pane to put a question, so a settled question with no
  // answers is not an outcome owed back to anyone: the section comes down
  // rather than standing as a heading over a line saying nothing is there.
  it('takes a section down when its question settles with nothing', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['uniprot:P0AEX9']);
    });
    await wait(SETTLE_MS);
    expect(screen.getByText(page.path)).toBeInTheDocument();

    await gk.answer('uniprot:P0AEX9', []);
    expect(screen.queryByText(page.path)).toBeNull();
    expect(asking()).toHaveLength(0);
    // The pane has a header the reader can see, so it cannot go blank.
    expect(paneEmpty()).toBeInTheDocument();
  });

  // The budget ends nothing the reader sees. A plugin still answering past it
  // keeps its section up, with the line naming it, and the pane does not say
  // it has nothing until the last plugin has answered.
  it('holds a section past the budget while a plugin is still answering', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['uniprot:P0AEX9']);
    });
    await wait(SETTLE_MS + BUDGET_MS + 1);
    expect(screen.getByText(page.path)).toBeInTheDocument();
    expect(asking()).toHaveLength(1);
    expect(paneEmpty()).toBeNull();

    await gk.answer('uniprot:P0AEX9', [item('gk:P0AEX9')]);
    expect(screen.getByText('gk:P0AEX9')).toBeInTheDocument();
    expect(asking()).toHaveLength(0);
  });

  it('reports the pane empty until a section has something to draw', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    expect(paneEmpty()).toBeInTheDocument();

    await act(async () => {
      services.cart.add({ ...item('gk:83333'), terms: ['taxon:83333'], plugin: 'gk' });
    });
    await wait(SETTLE_MS);
    expect(paneEmpty()).toBeNull();
    expect(screen.getByText('Cart')).toBeInTheDocument();
  });
});

describe('the Related pane’s add control', () => {
  // The row's button and the row's cart are the same plugin's: the one that
  // answered. Reading one cart and writing another left the button unpressed
  // after a press, and a second press removing nothing.
  it('adds and removes through the cart of the plugin that offered the row', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['uniprot:P0AEX9']);
    });
    await wait(SETTLE_MS);
    await gk.answer('uniprot:P0AEX9', [item('gk:P0AEX9')]);

    const button = screen.getByRole('button', { name: 'Add gk:P0AEX9 to the cart' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await act(async () => void fireEvent.click(button));
    // Stamped `gk`, exactly as genKnown's own page would have added it.
    expect(services.cart.items()).toEqual([{ ...item('gk:P0AEX9'), plugin: 'gk' }]);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    // The row stays, so the press that added it is the press that undoes it.
    await act(async () => void fireEvent.click(button));
    expect(services.cart.items()).toEqual([]);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('gk:P0AEX9')).toBeInTheDocument();
  });
});

describe('what a Related row says it answers', () => {
  // The cart's tiles are where the reader last saw these terms, so the row
  // names the term the way the tile does rather than as the plugins spell it.
  const carted = (id: string, subject: string, ...terms: string[]) => ({
    ...item(id),
    subject,
    terms,
    plugin: 'gk',
  });
  const answered = (id: string, ...terms: string[]): CartItem => ({
    ...item(id),
    answers: terms.map((term) => ({ term, kind: 'record' as const })),
  });

  it('names the cart term a row answers, in the words on the tile', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.cart.add(carted('fj:P11558', 'P11558', 'uniprot:P11558'));
      services.cart.add(carted('gk:562', 'Escherichia coli', 'ncbitaxon:562'));
    });
    await wait(SETTLE_MS);
    await gk.answer('uniprot:P11558,ncbitaxon:562', [answered('gk:x', 'uniprot:P11558')]);

    expect(screen.getByText('genKnown, because your cart has P11558')).toBeInTheDocument();
  });

  // One node arrives under an id and a name at once, and the plugin answers
  // with one item for both. Naming either alone would make the other look
  // like it did nothing.
  it('names both terms when one item answers two', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.cart.add(carted('fj:P11558', 'P11558', 'uniprot:P11558'));
      services.cart.add(carted('gk:562', 'Escherichia coli', 'ncbitaxon:562'));
    });
    await wait(SETTLE_MS);
    await gk.answer('uniprot:P11558,ncbitaxon:562', [
      answered('dia:soil', 'uniprot:P11558', 'ncbitaxon:562'),
    ]);

    expect(
      screen.getByText('genKnown, because your cart has P11558 and Escherichia coli'),
    ).toBeInTheDocument();
  });

  // Past two the line would be a paragraph in a pane thirty characters wide;
  // the count is the part that still reads.
  it('names the first term and counts the rest past two', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.cart.add(carted('fj:P11558', 'P11558', 'uniprot:P11558'));
      services.cart.add(carted('gk:562', 'Escherichia coli', 'ncbitaxon:562'));
      services.cart.add(carted('dia:soil', 'soil', 'biome:soil'));
    });
    await wait(SETTLE_MS);
    await gk.answer('uniprot:P11558,ncbitaxon:562,biome:soil', [
      answered('gk:x', 'uniprot:P11558', 'ncbitaxon:562', 'biome:soil'),
    ]);

    expect(
      screen.getByText('genKnown, because your cart has P11558 and 2 others'),
    ).toBeInTheDocument();
  });

  // Words matching words is a weaker thing than a lookup, and the sentence
  // says so rather than claiming the page is about the word.
  it('says a plugin that matched words mentions them', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['biome:soil', 'uniprot:P0AEX9']);
    });
    await wait(SETTLE_MS);
    await gk.answer('biome:soil,uniprot:P0AEX9', [
      { ...item('gk:soil'), answers: [{ term: 'biome:soil', kind: 'name' }] },
    ]);

    expect(screen.getByText('genKnown, because this page mentions soil')).toBeInTheDocument();
  });

  // A plugin built against an SDK with nowhere to put the term answers with
  // an item and no evidence; the row still says where the question came from.
  it('says where a plugin was asked when it gave no evidence', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['uniprot:P0AEX9', 'biome:soil']);
    });
    await wait(SETTLE_MS);
    await gk.answer('uniprot:P0AEX9,biome:soil', [item('gk:P0AEX9')]);

    expect(screen.getByText('genKnown, from the open page')).toBeInTheDocument();
  });

  // The reason is why the item was offered for a question; the cart is not a
  // question, and a tile that carried one would keep it until a reload.
  it('adds the item to the cart without its evidence', async () => {
    const gk = plugin();
    const services = await mount(gk.relate);
    await act(async () => {
      services.store.dispatch({ type: 'open', panel: page });
      services.terms.set(page.id, ['uniprot:P0AEX9']);
    });
    await wait(SETTLE_MS);
    await gk.answer('uniprot:P0AEX9', [answered('gk:P0AEX9', 'uniprot:P0AEX9')]);

    await act(
      async () =>
        void fireEvent.click(screen.getByRole('button', { name: 'Add gk:P0AEX9 to the cart' })),
    );
    expect(services.cart.items()).toEqual([{ ...item('gk:P0AEX9'), plugin: 'gk' }]);
    // …and the row does not spend a line repeating the heading it sits under:
    // the section is already named for the page, and P0AEX9 is in its title.
    expect(screen.queryByText(/because this page is about P0AEX9/)).toBeNull();
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
      services.cart.add({ ...item('gk:83333'), terms: ['taxon:83333'], plugin: 'gk' });
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

    // The cart answers with nothing: its section goes, and the page's section
    // — the one with rows — is the element it always was.
    await gk.answer('taxon:83333', []);
    expect(screen.queryByText('Cart')).toBeNull();
    expect(screen.getByText(page.path)).toBe(first[0]);
    expect(screen.getByText('gk:P0AEX9')).toBeInTheDocument();
    expect(asking()).toHaveLength(0);
  });
});
