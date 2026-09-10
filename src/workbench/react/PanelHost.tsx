import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, EmptyState, Loader } from '@kbase/design-system';
import type { Crumb, Mount, PanelHandle, PluginHost } from '../../plugins/sdk';
import type { Panel } from '../core';
import { useServices } from './context';
import { pluginHostFor } from '../host/createWorkbench';
import styles from './Workbench.module.css';

// Renders one panel: fetches its module through the host's index, hands the
// module's `mount` an element and the SDK handles, and fences it. A crash or
// a missing plugin stays inside this box; the tab, its neighbours and the
// chrome keep working.
export function PanelHost({ panel }: { panel: Panel }) {
  const services = useServices();
  const { source, navIntentRef, dispatch } = services;
  const listed = source.has(panel.plugin, panel.kind);
  // The module, once the index has it; the index is the store, so a load
  // finishing anywhere re-renders this panel.
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const module = listed ? source.loaded(panel.plugin, panel.kind) : undefined;
  const [failure, setFailure] = useState<Error | null>(null);

  useEffect(() => {
    if (!listed || module) return;
    let live = true;
    source.module(panel.plugin, panel.kind).catch((err: unknown) => {
      if (live) setFailure(err instanceof Error ? err : new Error(String(err)));
    });
    return () => {
      live = false;
    };
  }, [source, panel.plugin, panel.kind, listed, module]);

  // A closed panel's terms are not the workbench's business any more.
  useEffect(() => () => services.terms.forget(panel.id), [services.terms, panel.id]);

  // Live: `path` and `focused` read the store when asked, so a mount that
  // keeps the handle sees the current values, and `subscribe` says when
  // they change.
  const handle = useMemo<PanelHandle>(() => {
    const id = panel.id;
    const snapshot = () => {
      const layout = services.store.get();
      return `${layout.panels[id]?.path ?? ''} ${layout.focus === id}`;
    };
    return {
      id,
      plugin: panel.plugin,
      kind: panel.kind,
      get path() {
        return services.store.get().panels[id]?.path ?? '';
      },
      get focused() {
        return services.store.get().focus === id;
      },
      navigate: (path, options) => {
        navIntentRef.current = options?.replace ? 'replace' : 'push';
        dispatch({ type: 'setPath', panel: id, path });
      },
      setTitle: (title) => services.titles.set(id, title),
      setCrumbs: (crumbs: Crumb[]) => services.crumbs.set(id, crumbs),
      setTerms: (terms) => services.terms.set(id, terms),
      subscribe: (listener) => {
        let last = snapshot();
        return services.store.subscribe(() => {
          const now = snapshot();
          if (now === last) return;
          last = now;
          listener();
        });
      },
    };
  }, [services, navIntentRef, dispatch, panel.id, panel.plugin, panel.kind]);
  const host = useMemo<PluginHost>(
    () => pluginHostFor(services, panel.plugin),
    [services, panel.plugin],
  );

  if (!listed) return <GhostPanel panel={panel} />;
  const title = source.manifest(panel.plugin)?.title ?? panel.plugin;
  return (
    <PanelBoundary key={panel.id}>
      {failure ? (
        <Failed error={failure} />
      ) : module ? (
        <Mounted mount={module.mount} handle={handle} host={host} />
      ) : (
        <Loading title={title} />
      )}
    </PanelBoundary>
  );
}

// The element the plugin draws into: a fresh child per mount, so a mount
// whose teardown is still pending — a React root unmounts after the commit
// that removed it — never shares an element with the next. `display:
// contents` keeps the plugin's own root in the same flex or grid context
// the panel body gives it.
function Mounted({ mount, handle, host }: { mount: Mount; handle: PanelHandle; host: PluginHost }) {
  const ref = useRef<HTMLDivElement>(null);
  const mountOnce = useCallback(
    (el: HTMLElement) => mount(el, { panel: handle, host }) ?? undefined,
    [mount, handle, host],
  );
  useEffect(() => {
    const body = ref.current;
    if (!body) return;
    const el = document.createElement('div');
    el.style.display = 'contents';
    body.appendChild(el);
    const cleanup = mountOnce(el);
    return () => {
      cleanup?.();
      el.remove();
    };
  }, [mountOnce]);
  return <div ref={ref} style={{ display: 'contents' }} data-panel-body={handle.id} />;
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

// Thrown from render so the boundary below shows it the way a crash is shown.
function Failed({ error }: { error: Error }): never {
  throw error;
}

// A panel whose plugin is no longer installed, or no longer has this kind of
// panel. The layout keeps the slot so reinstalling brings it back where it was.
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
