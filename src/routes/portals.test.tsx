import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from '../routeTree.gen';
import styles from './portals.module.css';

// Expectations are derived from what the page renders, never written down
// from the portal data or the copy. Adding a portal, renaming a facet or
// rewording a blurb must not fail a test here.

function mountGallery() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider
        router={createRouter({
          routeTree,
          context: { queryClient },
          history: createMemoryHistory({ initialEntries: ['/portals'] }),
        })}
      />
    </QueryClientProvider>,
  );
  return waitFor(() => expect(cards().length).toBeGreaterThan(0));
}

const cards = () => [...document.querySelectorAll<HTMLElement>(`.${styles.card}`)];
const titleOf = (card: HTMLElement) => card.querySelector(`.${styles.titleRow} h3`)?.textContent;
const facetsOf = (card: HTMLElement) =>
  [...card.querySelectorAll(`.${styles.facets} > *`)].map((c) => c.textContent?.trim() ?? '');

const search = () => screen.getByRole('textbox', { name: /search portals/i });

// Click the label, as a reader does: the radio itself is visually hidden.
const filters = () =>
  screen.getAllByRole('radio').map((input) => {
    const el = input.closest('label') as HTMLElement;
    return { el, label: el?.textContent?.trim() ?? '' };
  });

const namedFilters = () => filters().filter((f) => !/^all/i.test(f.label));

describe('portal gallery', () => {
  it('renders every portal as a card that links out', async () => {
    await mountGallery();

    for (const card of cards()) {
      const link = card.querySelector('a[href]');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link?.getAttribute('href')).toMatch(/^https?:\/\/.+\/$/);
    }
  });

  // A card shows a screenshot or a stand-in for one, never both and never
  // neither, and links out either way: the portal exists whether or not we
  // have captured it.
  it('gives every card a thumbnail or a stand-in, and links either way', async () => {
    await mountGallery();

    for (const card of cards()) {
      const hasShot = Boolean(card.querySelector(`img.${styles.shot}`));
      const hasStandIn = Boolean(card.querySelector(`.${styles.shotEmpty}`));
      expect(hasShot).not.toBe(hasStandIn);
      expect(card.querySelector('a[href]')).toBeTruthy();
    }
  });

  it('keeps sources collapsed until the header is opened', async () => {
    const user = userEvent.setup();
    await mountGallery();

    const card = cards().find((c) => c.querySelector(`.${styles.sources} button`));
    expect(card).toBeTruthy();

    expect(card!.querySelector(`.${styles.sources} li`)).toBeNull();
    await user.click(card!.querySelector<HTMLElement>(`.${styles.sources} button`)!);
    expect(card!.querySelector(`.${styles.sources} li`)).toBeTruthy();
  });

  // The filter row is derived from the facets on the cards. A filter matching
  // no card, or a facet with no filter, means that derivation has drifted.
  it('offers exactly the facets that appear on cards', async () => {
    await mountGallery();

    const onCards = new Set(cards().flatMap(facetsOf));
    const offered = new Set(namedFilters().map((f) => f.label));

    expect(offered).toEqual(onCards);
  });

  it('narrows to the cards carrying the chosen facet', async () => {
    const user = userEvent.setup();
    await mountGallery();

    const facet = namedFilters()[0];
    await user.click(facet.el);

    const shown = cards();
    expect(shown.length).toBeGreaterThan(0);
    for (const card of shown) {
      expect(facetsOf(card)).toContain(facet.label);
    }
  });

  it('narrows to cards matching the search, and restores when cleared', async () => {
    const user = userEvent.setup();
    await mountGallery();

    const before = cards().map(titleOf);
    const target = before[0]!;

    await user.type(search(), target);
    expect(cards().map(titleOf)).toContain(target);
    expect(cards().length).toBeLessThanOrEqual(before.length);

    await user.clear(search());
    expect(cards().map(titleOf)).toEqual(before);
  });

  it('offers a way back when a search matches nothing', async () => {
    const user = userEvent.setup();
    await mountGallery();

    const before = cards().map(titleOf);

    await user.click(namedFilters()[0].el);
    await user.type(search(), 'zzzz-no-such-portal');
    expect(cards()).toHaveLength(0);

    // Scoped to the empty state: SearchBar has a clear button of its own.
    // This one has to drop the facet too, or its offer is a lie.
    const reset = document.querySelector<HTMLElement>(`.${styles.empty} button`)!;
    await user.click(reset);
    expect(cards().map(titleOf)).toEqual(before);
  });
});
