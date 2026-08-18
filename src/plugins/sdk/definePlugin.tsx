import { useState } from 'react';
import { RouterProvider, createRouter, type AnyRoute } from '@tanstack/react-router';

import { CONTRACT_VERSION, type Plugin, type PluginProps } from './contract';

/** Wrap a route tree as a plugin: its own router over the host's shared history, scoped to basepath. */
export function definePlugin(routeTree: AnyRoute): Plugin {
  function PluginRoot({ router, basepath }: PluginProps) {
    const [pluginRouter] = useState(() =>
      createRouter({ routeTree, history: router.history, basepath }),
    );
    return <RouterProvider router={pluginRouter} />;
  }
  return { contractVersion: CONTRACT_VERSION, Component: PluginRoot };
}
