import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from '../routeTree.gen';
import { testWorkbench } from '../test/workbench';

describe('Home route', () => {
  it('renders the roadmap hero with the user welcome when authenticated', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // Seed the auth cache so the root beforeLoad gate lets us through
    // without making a network request.
    queryClient.setQueryData(['auth', 'me'], {
      user: 'tester',
      display: 'Tester',
    });
    queryClient.setQueryData(['auth', 'tokenInfo'], {
      id: 'session-1',
      user: 'tester',
      mfa: 'Used',
    });

    const router = createRouter({
      routeTree,
      context: { queryClient, workbench: testWorkbench() },
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: /welcome, tester/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
