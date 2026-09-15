import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Background, CartItem, TermsQuery } from '@kbase/plugin-sdk';
import type { StoredCartItem } from '../core';
import {
  createCartStore,
  createQueryStore,
  createTermStore,
  createWorkbenchStore,
  defaultLayout,
  makeRoute,
} from '../core';
import type { HostIndex } from '../host/installed';
import { SETTLE_MS, createQueryRunner } from '../host/query/runner';
import { ServicesContext } from './context';
import type { WorkbenchServices } from '../host/services';
import { createTitleStore } from '../host/titles';
import { useAmbientQueries } from './useAmbientQueries';

const page = makeRoute('fj', '/protein/P0AEX9', 'a');

// Only the services the hook and `useLayout` read.
function harness(background: Background) {
  const store = createWorkbenchStore({ initial: defaultLayout() });
  store.dispatch({ type: 'open', panel: page });
  const services = {
    store,
    query: createQueryStore(),
    terms: createTermStore(),
    titles: createTitleStore(),
    cart: createCartStore(),
  } as unknown as WorkbenchServices;
  const index = {
    backgrounds: () => [{ plugin: 'gk', title: 'gk', background }],
  } as unknown as HostIndex;
  const full: WorkbenchServices = {
    ...services,
    queryRunner: createQueryRunner(index, services.query),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesContext.Provider value={full}>{children}</ServicesContext.Provider>
  );
  renderHook(() => useAmbientQueries(), { wrapper });
  return full;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the ambient page query', () => {
  it('asks once for terms, and a later title renames the heading without asking again', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(({ terms }) =>
      terms.map((t) => ({ id: `gk:${t}`, name: t })),
    );
    const { terms, titles, query } = harness({ relate });

    // The panel reports what it is about; its title comes later, when the
    // fetch that named the protein lands.
    await act(async () => {
      terms.set(page.id, ['uniprot:P0AEX9']);
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    expect(relate).toHaveBeenCalledTimes(1);
    expect(query.get('page').label).toBe(page.path);

    await act(async () => {
      titles.set(page.id, 'P0AEX9 · Structure');
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    expect(relate).toHaveBeenCalledTimes(1);
    expect(query.get('page').label).toBe('P0AEX9 · Structure');
    expect(query.get('page').answers[0].stale).toBeUndefined();
    expect(query.get('page').answers[0].items.map((i) => i.id)).toEqual(['gk:uniprot:P0AEX9']);
  });

  it('renames the heading of a round still waiting for the settle', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => []);
    const { terms, titles, query } = harness({ relate });
    await act(async () => {
      terms.set(page.id, ['uniprot:P0AEX9']);
    });
    await act(async () => {
      titles.set(page.id, 'P0AEX9 · Structure');
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    // The settle's publish carries the title, not the path `set` was given.
    expect(relate).toHaveBeenCalledTimes(1);
    expect(query.get('page').label).toBe('P0AEX9 · Structure');
  });

  it('asks again when the panel reports different terms', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => []);
    const { terms, query } = harness({ relate });
    await act(async () => {
      terms.set(page.id, ['uniprot:P0AEX9']);
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    await act(async () => {
      terms.set(page.id, ['uniprot:P0AEX9', 'taxon:83333']);
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    expect(relate).toHaveBeenCalledTimes(2);
    expect(query.get('page').pool).toEqual(['uniprot:P0AEX9', 'taxon:83333']);
  });
});

// These tests turn on the terms an item carries and on how many items there
// are; the rest is whatever the store requires.
const item = (id: string, terms?: string[]): StoredCartItem => ({
  id,
  plugin: 'fj',
  name: id,
  terms,
});

describe('the ambient cart query', () => {
  it('a count that changes without the terms changing renames, and asks nobody', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => [{ id: 'gk:row', name: 'row' }]);
    const { cart, query } = harness({ relate });
    await act(async () => {
      cart.add(item('fj:P0AEX9', ['uniprot:P0AEX9']));
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    expect(relate).toHaveBeenCalledTimes(1);
    expect(query.get('cart').label).toBe('1 item');

    // An item that carries nothing the plugins have not been asked about:
    // the cart is a longer list, not a different question.
    await act(async () => {
      cart.add(item('fj:note'));
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    expect(relate).toHaveBeenCalledTimes(1);
    expect(query.get('cart').label).toBe('2 items');
    expect(query.get('cart').answers[0].stale).toBeUndefined();
    expect(query.get('cart').pool).toEqual(['uniprot:P0AEX9']);
  });

  it('asks again when an item brings a term with it', async () => {
    const relate = vi.fn<(q: TermsQuery) => CartItem[]>(() => []);
    const { cart, query } = harness({ relate });
    await act(async () => {
      cart.add(item('fj:P0AEX9', ['uniprot:P0AEX9']));
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    await act(async () => {
      cart.add(item('fj:83333', ['taxon:83333']));
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
    });
    expect(relate).toHaveBeenCalledTimes(2);
    expect(relate.mock.calls[1][0].terms).toEqual(['taxon:83333']);
    expect(query.get('cart').label).toBe('2 items');
  });
});
