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
import { localPlugins } from './plugins/local';
import { createWorkbench, loadInstalled } from './workbench/host';
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

// Bundled plugins plus whatever the registry lists; a registry that is down
// leaves the bundled ones working.
//
// A bundled plugin wins over a registry entry with the same id, which is what
// stops a registry from replacing first-party code. That also hides the real
// plugin while one is being extracted from this repo into its own, so dev
// builds can stand a bundled one down by id: VITE_DEV_UNBUNDLE=function-junction.
const standDown = new Set(
  (import.meta.env.DEV ? (import.meta.env.VITE_DEV_UNBUNDLE ?? '') : '')
    .split(',')
    .map((id: string) => id.trim())
    .filter(Boolean),
);
const bundled = localPlugins.filter((p) => !standDown.has(p.manifest.id));

const workbench = createWorkbench({
  installed: await loadInstalled(bundled),
  storage: window.localStorage,
  defaultPinned: ['shortcuts', 'koros', 'data', 'jobs'],
  defaultAssistant: 'koros',
});

const router = createRouter({
  routeTree,
  context: { queryClient, workbench },
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
