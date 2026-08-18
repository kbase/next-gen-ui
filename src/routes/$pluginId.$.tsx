import { Component, type ReactNode } from 'react';
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router';
import { Alert, Button, Loader } from '@kbase/design-system';

import { pluginsOptions } from '../plugins/registry';
import { loadPlugin, registerPlugin } from '../plugins/host';

// Plugins mount at /{id} and below. Static routes match first, so a plugin only
// claims an unused id; a future app route could shadow one — guarded by the
// registry's reserved-id denylist.
export const Route = createFileRoute('/$pluginId/$')({
  loader: async ({ context, params }) => {
    const plugins = await context.queryClient.ensureQueryData(pluginsOptions());
    const entry = plugins.find((p) => p.id === params.pluginId);
    if (!entry) throw notFound();
    registerPlugin(entry);
    return { plugin: await loadPlugin(entry.id) };
  },
  component: PluginHost,
  pendingComponent: () => <Loader label="Loading plugin" />,
  notFoundComponent: () => <Alert color="red">Page not found.</Alert>,
  errorComponent: PluginError,
});

function PluginHost() {
  const { pluginId } = Route.useParams();
  const { plugin } = Route.useLoaderData();
  const router = useRouter();

  const Mounted = plugin.Component;
  return (
    <PluginBoundary>
      <Mounted router={router} basepath={`/${pluginId}`} />
    </PluginBoundary>
  );
}

// The registry was unreachable or the plugin failed to load — offer a retry.
function PluginError() {
  const router = useRouter();
  return (
    <Alert color="red">
      This plugin failed to load.{' '}
      <Button type="button" variant="outline" size="sm" onClick={() => void router.invalidate()}>
        Retry
      </Button>
    </Alert>
  );
}

// Contain a plugin's render error instead of blanking the app.
class PluginBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state: { failed: boolean } = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render(): ReactNode {
    return this.state.failed ? (
      <Alert color="red">This plugin crashed.</Alert>
    ) : (
      this.props.children
    );
  }
}
