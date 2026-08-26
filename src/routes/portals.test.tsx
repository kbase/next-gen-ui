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
const titleOf = (card: HTMLElement) => card.querySelector(`.${styles.titleRow} h4`)?.textContent;
const sections = () => [...document.querySelectorAll<HTMLElement>(`.${styles.section}`)];
// The heading a section is labelled by, not the first h3 inside it: every
// card's sources disclosure is an h3 too.
const headingEl = (section: HTMLElement) =>
  document.getElementById(section.getAttribute('aria-labelledby') ?? '');
const headingOf = (section: HTMLElement) => headingEl(section)?.textContent;
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

  // A portal without a captured thumbnail is not rendered at all, so every
  // card that is rendered has one.
  it('gives every card a thumbnail', async () => {
    await mountGallery();

    for (const card of cards()) {
      expect(card.querySelector(`img.${styles.shot}`)).toBeTruthy();
    }
  });

  it('groups every card under a headed, described section', async () => {
    await mountGallery();

    const grouped = sections().flatMap((s) => [
      ...s.querySelectorAll<HTMLElement>(`.${styles.card}`),
    ]);
    expect(grouped).toEqual(cards());
    for (const section of sections()) {
      const heading = headingEl(section);
      expect(heading?.tagName).toBe('H3');
      expect(heading?.textContent).toBeTruthy();
      expect(heading?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(section.querySelector(`.${styles.sectionDescription}`)?.textContent).toBeTruthy();
    }
  });

  // A section is a partition, not a filter: a facet cuts across sections,
  // and a section it leaves empty is not shown.
  it('shows, under a facet, exactly the sections with a card carrying it', async () => {
    const user = userEvent.setup();
    await mountGallery();

    const facetsBySection = new Map(
      sections().map((s) => [
        headingOf(s),
        new Set([...s.querySelectorAll<HTMLElement>(`.${styles.card}`)].flatMap(facetsOf)),
      ]),
    );

    for (const label of namedFilters().map((f) => f.label)) {
      await user.click(namedFilters().find((f) => f.label === label)!.el);

      const expected = [...facetsBySection].filter(([, f]) => f.has(label)).map(([h]) => h);
      expect(sections().map(headingOf)).toEqual(expected);
      for (const section of sections()) {
        expect(section.querySelectorAll(`.${styles.card}`).length).toBeGreaterThan(0);
      }
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

  // A query retrieves; the result list is flat, and each card says which
  // section it came from. A facet pill browses, and keeps the sections.
  it("flattens the gallery for a query, naming each card's section", async () => {
    const user = userEvent.setup();
    await mountGallery();

    const headings = sections().map(headingOf);
    const sectionOfTitle = new Map(
      sections().flatMap((s) =>
        [...s.querySelectorAll<HTMLElement>(`.${styles.card}`)].map((c) => [
          titleOf(c),
          headingOf(s),
        ]),
      ),
    );

    await user.type(search(), cards()[0]!.querySelector(`.${styles.titleRow} h4`)!.textContent!);
    expect(sections()).toHaveLength(0);
    expect(cards().length).toBeGreaterThan(0);
    for (const card of cards()) {
      const section = sectionOfTitle.get(titleOf(card))!;
      expect(card.querySelector(`.${styles.sectionLabel}`)?.textContent).toBe(section);
      // The link's aria-label is its whole accessible name, so the label has
      // to be in it or assistive technology never hears the section.
      expect(card.querySelector('a[href]')?.getAttribute('aria-label')).toContain(section);
    }

    await user.clear(search());
    await user.click(namedFilters()[0].el);
    expect(sections().length).toBeGreaterThan(0);
    expect(headings).toEqual(expect.arrayContaining(sections().map(headingOf)));
    expect(document.querySelector(`.${styles.sectionLabel}`)).toBeNull();
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
