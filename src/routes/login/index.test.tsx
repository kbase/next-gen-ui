import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// config.ts reads the DOM once at module load, so each case sets the
// rendered meta tags and then imports the route tree fresh.
function setMeta(name: string, content: string) {
  const el = document.createElement('meta');
  el.setAttribute('name', `config:${name}`);
  el.setAttribute('content', content);
  document.head.appendChild(el);
}

async function mountLogin() {
  const { routeTree } = await import('../../routeTree.gen');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ['/login'] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole('button', { name: /sign in with orcid/i });
}

function environmentField(): HTMLInputElement | null {
  return document.querySelector('input[name="environment"]');
}

afterEach(() => {
  document.head.querySelectorAll('meta[name^="config:"]').forEach((el) => el.remove());
  vi.resetModules();
});

describe('login form environment field', () => {
  it('posts the configured auth environment', async () => {
    setMeta('auth-origin', 'https://kbase.us');
    setMeta('auth-environment', 'gen2');
    await mountLogin();
    expect(environmentField()?.value).toBe('gen2');
  });

  it('sends no environment field when none is configured', async () => {
    setMeta('auth-origin', 'https://kbase.us');
    setMeta('auth-environment', '__AUTH_ENVIRONMENT__');
    await mountLogin();
    expect(environmentField()).toBeNull();
  });
});
