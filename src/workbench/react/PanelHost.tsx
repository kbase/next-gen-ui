import { Component, Suspense, useCallback, useMemo } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, EmptyState, Loader } from '@kbase/design-system';
import { HostContext, PanelContext } from '../../plugins/sdk';
import type { Crumb, PanelHandle, PluginHost } from '../../plugins/sdk';
import type { Panel } from '../core';
import { panelType } from '../core';
import { useServices } from './context';
import { pluginHostFor } from '../host/createWorkbench';
import styles from './Workbench.module.css';

// Renders one panel: looks its component up in the host's index, gives it
// the SDK contexts, and fences it. A crash or a missing plugin stays inside
// this box; the tab, its neighbours and the chrome keep working.
export function PanelHost({ panel, focused }: { panel: Panel; focused: boolean }) {
  const services = useServices();
  const definition = services.source.panel(panelType(panel.plugin, panel.kind));

  const setTitle = useCallback(
    (title: string) => services.titles.set(panel.id, title),
    [services.titles, panel.id],
  );
  const setCrumbs = useCallback(
    (crumbs: Crumb[]) => services.crumbs.set(panel.id, crumbs),
    [services.crumbs, panel.id],
  );
  const handle = useMemo<PanelHandle>(
    () => ({
      id: panel.id,
      plugin: panel.plugin,
      kind: panel.kind,
      params: panel.params,
      focused,
      setTitle,
      setCrumbs,
    }),
    [panel, focused, setTitle, setCrumbs],
  );
  const host = useMemo<PluginHost>(
    () => pluginHostFor(services, panel.plugin),
    [services, panel.plugin],
  );

  if (!definition) return <GhostPanel panel={panel} />;
  const Component = definition.component;
  const title = services.source.manifest(panel.plugin)?.title ?? panel.plugin;
  return (
    <PanelContext value={handle}>
      <HostContext value={host}>
        <PanelBoundary key={panel.id}>
          <Suspense fallback={<Loading title={title} />}>
            <Component />
          </Suspense>
        </PanelBoundary>
      </HostContext>
    </PanelContext>
  );
}

// The panel's own empty state until its code arrives, named: a bare
// spinner in the corner of a blank pane says nothing about what is
// coming, and reads as a stray graphic rather than the panel loading.
function Loading({ title }: { title: string }) {
  return (
    <EmptyState
      icon={<Loader size={36} label={`Loading ${title}`} />}
      title={`Loading ${title}…`}
    />
  );
}

// A panel whose plugin is no longer installed. The layout keeps the slot so
// reinstalling brings it back where it was.
function GhostPanel({ panel }: { panel: Panel }) {
  const { dispatch } = useServices();
  return (
    <div className={styles.panelMessage} role="group" aria-label="Unavailable panel">
      <p className="body">
        The plugin <strong>{panel.plugin}</strong> is not installed, so this panel cannot be shown.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => dispatch({ type: 'close', panel: panel.id })}
      >
        Close
      </Button>
    </div>
  );
}

interface BoundaryState {
  error: Error | null;
}

export class PanelBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('panel crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={styles.panelMessage} role="alert">
        <p className="body">This panel crashed.</p>
        <p className={`caption ${styles.errorText}`}>{this.state.error.message}</p>
        <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}
