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

describe('portal gallery', () => {
  it('lists every cleared portal by default, and no others', async () => {
    mountGallery();
    expect(await screen.findByRole('heading', { level: 1, name: /portal gallery/i })).toBeVisible();
    expect(cardLinks()).toHaveLength(5);
    expect(screen.queryByRole('link', { name: /ENIGMA Strata/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /GenePool/ })).toBeNull();
  });

  // A hidden portal's tags must not survive as filters that match nothing.
  it("offers no filter for a hidden portal's tags", async () => {
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });
    expect(screen.queryByRole('radio', { name: 'Subsurface' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Benchmarking' })).toBeNull();
  });

  it('filters by free-text search across blurbs and credits', async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    await user.type(screen.getByRole('textbox', { name: /search portals/i }), 'cazyme');
    expect(cardLinks()).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Fungal Jungle/ })).toBeVisible();
  });

  // The credit line is searchable, not just subject tags and blurbs.
  it('matches on the credit line as well as subject', async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    await user.type(screen.getByRole('textbox', { name: /search portals/i }), 'jgi');
    expect(cardLinks()).toHaveLength(2);
  });

  it('reports when nothing matches and can be cleared', async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    await user.type(screen.getByRole('textbox', { name: /search portals/i }), 'zzzznope');
    expect(cardLinks()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /clear the search/i }));
    expect(cardLinks()).toHaveLength(5);
  });

  it('filters by tag', async () => {
    const user = userEvent.setup();
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    await user.click(screen.getByRole('radio', { name: 'Metagenomics' }));
    expect(cardLinks()).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Diaspora/ })).toBeVisible();
  });

  it('has no call-to-action buttons', async () => {
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    expect(screen.queryByRole('button', { name: /develop a portal/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /publish your portal/i })).toBeNull();
    expect(screen.queryByText(/your portal here/i)).toBeNull();
  });

  it('says it is a soft launch and offers a contact', async () => {
    mountGallery();
    await screen.findByRole('heading', { level: 1, name: /portal gallery/i });

    expect(screen.getByText(/soft launch/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /contact us/i })).toBeVisible();
  });
});
