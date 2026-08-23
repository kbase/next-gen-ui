import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Design system: tokens first (vars, fonts, utilities), then globals.
import './design-system/fonts.css';
import './design-system/tokens.css';
import './design-system/prism.css';
import './design-system/prose.css';
import './design-system/utilities.css';
import './design-system/global.css';

import { routeTree } from './routeTree.gen';
import {
  installAuthExpiryWatcher,
  installAuthFailureInterceptor,
  installCrossTabAuthSync,
} from './api/auth';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Each installer is idempotent (later calls overwrite the prior
// handler), so dev StrictMode's intentional double-mount is safe.
installCrossTabAuthSync(queryClient);
installAuthFailureInterceptor(queryClient);
installAuthExpiryWatcher(queryClient);

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
