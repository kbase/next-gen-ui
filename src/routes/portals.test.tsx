import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from '../routeTree.gen';

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
}

function cardLinks() {
  return screen.queryAllByRole('link', { name: /^Open the .* portal/ });
}

// Scoped to the card head: Accordion renders its trigger as a heading too.
function cardTitles() {
  return [...document.querySelectorAll('.portal-card__title-row h3')].map((h) => h.textContent);
}

describe('portal gallery', () => {
  it('lists every portal by default', async () => {
    mountGallery();
    expect(await screen.findByRole('heading', { level: 1, name: /portal gallery/i })).toBeVisible();
    expect(cardTitles()).toHaveLength(7);
  });

  // A portal without a screenshot differs only in the screenshot: it still
  // links out like every other card.
  it('links a portal that has no screenshot yet', async () => {
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    expect(cardLinks()).toHaveLength(7);
    expect(screen.getByRole('link', { name: /Open the Phagecast portal/ })).toBeVisible();
    expect(screen.getAllByText('No screenshot yet')).toHaveLength(2);
  });

  // Sources come from each app's registry; an app without one shows nothing
  // rather than a guess. Visible on load, not behind a click.
  it("lists a portal's sources behind a counted header", async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    // Closed by default; the header carries the count.
    expect(screen.queryByText('GTDB')).toBeNull();
    expect(cardTitles()).toHaveLength(7);

    const triggers = screen.getAllByRole('button', { name: /data sources/i });
    expect(triggers).toHaveLength(7);
    expect(triggers[0]).toHaveAccessibleDescription('14');

    await user.click(triggers[0]);
    expect(screen.getByText('GTDB')).toBeVisible();
  });

  // Every filter is a facet and every facet is a filter; the specific
  // topic words are plain text and deliberately not filterable.
  it('offers a filter for every facet and nothing else', async () => {
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });
    for (const facet of ['Genomes', 'Ecology', 'Environment', 'Proteins']) {
      expect(screen.getByRole('radio', { name: facet })).toBeVisible();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.queryByRole('radio', { name: 'CAZymes' })).toBeNull();
  });

  it('filters by free-text search across blurbs and sources', async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    await user.type(screen.getByRole('textbox', { name: /search portals/i }), 'cazyme');
    expect(cardLinks()).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Fungal Jungle/ })).toBeVisible();
  });

  // The source list is searchable, not just subject tags and blurbs.
  it('matches on a data source as well as subject', async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    await user.type(screen.getByRole('textbox', { name: /search portals/i }), 'jgi');
    expect(cardLinks()).toHaveLength(2);
  });

  // Clearing has to drop the filter too, or "see all N" is a false promise.
  it('reports when nothing matches, and clears both search and filter', async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    await user.click(screen.getByRole('radio', { name: 'Proteins' }));
    await user.type(screen.getByRole('textbox', { name: /search portals/i }), 'zzzznope');
    expect(cardLinks()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /clear search and filters/i }));
    expect(cardTitles()).toHaveLength(7);
  });

  it('filters by tag', async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    await user.click(screen.getByRole('radio', { name: 'Genomes' }));
    expect(cardTitles()).toHaveLength(5);
  });
});
