import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from '../routeTree.gen';

describe('Home route', () => {
  it('sends a signed-in user to the gallery', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // Seed the auth cache so the root beforeLoad gate lets us through
    // without making a network request.
    queryClient.setQueryData(['auth', 'me'], {
      user: 'tester',
      display: 'Tester',
    });
    queryClient.setQueryData(['auth', 'tokenInfo', null], {
      id: 'session-1',
      user: 'tester',
      mfa: 'Used',
    });

    const router = createRouter({
      routeTree,
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/portals'));
  });
});
