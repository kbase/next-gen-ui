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
import { loadInstalled, loadWorkbench } from './workbench/host';
import { createWorkbench } from './workbench/compose';
import { DEFAULT_ASSISTANT, DEFAULT_INTENT, DEFAULT_PINNED } from './workbenchDefaults';
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
// stops a registry from replacing first-party code.
//
// The last session's layout, cart and settings are loaded before the
// workbench exists, from localStorage today. An account service replaces
// this call with one that fetches; `createWorkbench` does not change.
const { installed, declined } = await loadInstalled(localPlugins);
const workbench = createWorkbench({
  installed,
  declined,
  persistence: await loadWorkbench(window.localStorage),
  defaultPinned: [...DEFAULT_PINNED],
  defaultAssistant: DEFAULT_ASSISTANT,
  defaultIntent: DEFAULT_INTENT,
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
