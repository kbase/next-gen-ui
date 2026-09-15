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
import { ArrowCounterClockwise, Placeholder, Plug } from '@phosphor-icons/react';
import { Alert, Button, EmptyState, Loader } from '@kbase/design-system';
import type { Crumb, Mount, PanelHandle, PluginHost } from '@kbase/plugin-sdk';
import { CrumbsSchema, PanelTermsSchema, PathSchema, TitleSchema } from '@kbase/plugin-sdk';
import type { Panel } from '../../core';
import { placementOf } from '../../core';
import { useLayout, useRun, useServices } from '../context';
import { taken } from '../../host/checked';
import { forgetPanel } from '../../host/services';
import { pluginHostFor } from '../../host/pluginHost';
import styles from './PanelHost.module.css';

// Renders one panel: fetches its module through the host's index, hands the
// module's `mount` an element and the SDK handles, and fences it. A crash or
// a missing plugin stays inside this box; the tab, its neighbours and the
// chrome keep working.
export function PanelHost({ panel }: { panel: Panel }) {
  const services = useServices();
  const { source, dispatch } = services;
  const listed = source.has(panel.plugin, panel.kind);
  // The module, once the index has it; the index is the store, so a load
  // finishing anywhere re-renders this panel.
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const module = listed ? source.loaded(panel.plugin, panel.kind) : undefined;
  // A failed import and the attempt it came from. Bumping `attempt` re-runs
  // the effect below, and the index starts a fresh import: a rejected load
  // leaves nothing in its caches (host/installed.ts:97-99), so the retry is
  // a real second fetch rather than the first rejection replayed.
  const [load, setLoad] = useState<{ attempt: number; error: Error | null }>({
    attempt: 0,
    error: null,
  });
  const retry = useCallback(() => setLoad((l) => ({ attempt: l.attempt + 1, error: null })), []);

  useEffect(() => {
    if (!listed || module) return;
    let live = true;
    source.module(panel.plugin, panel.kind).catch((err: unknown) => {
      // `live` is false once a retry has superseded this attempt, so the
      // rejection it was waiting for cannot re-raise the message.
      if (live)
        setLoad((l) => ({ ...l, error: err instanceof Error ? err : new Error(String(err)) }));
    });
    return () => {
      live = false;
    };
  }, [source, panel.plugin, panel.kind, listed, module, load.attempt]);

  // A closed panel's title, trail and terms are not the workbench's business
  // any more. This host is mounted once per panel in the layout and unmounted
  // when the panel leaves it, so this is the one place that knows a panel is
  // gone for good — a hidden tab keeps its body mounted and keeps all three.
  useEffect(() => () => forgetPanel(services, panel.id), [services, panel.id]);

  // Live: `path` and `focused` read the store when asked, so a mount that
  // keeps the handle sees the current values, and `subscribe` says when
  // they change.
  const handle = useMemo<PanelHandle>(() => {
    const id = panel.id;
    const who = `plugin ${panel.plugin}`;
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
      // Each of these takes a value from the plugin, so each is checked
      // against the SDK's schema for it and refused to the plugin's own
      // call (host/checked.ts). A panel's title, trail and terms are read
      // by the tab strip, the breadcrumb row and every other plugin, and a
      // panel whose body is a framed app builds them where TypeScript
      // cannot see them.
      navigate: (path, options) => {
        dispatch({
          type: 'setPath',
          panel: id,
          path: taken(who, 'navigate refused the path', PathSchema, path),
          replace: options?.replace,
        });
      },
      setTitle: (title) =>
        services.titles.set(id, taken(who, 'setTitle refused the title', TitleSchema, title)),
      setCrumbs: (crumbs: Crumb[]) =>
        services.crumbs.set(id, taken(who, 'setCrumbs refused the trail', CrumbsSchema, crumbs)),
      setTerms: (terms) =>
        services.terms.set(id, taken(who, 'setTerms refused the terms', PanelTermsSchema, terms)),
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
  }, [services, dispatch, panel.id, panel.plugin, panel.kind]);
  const host = useMemo<PluginHost>(
    () => pluginHostFor(services, panel.plugin),
    [services, panel.plugin],
  );
  const narrow = useNarrow(panel);

  if (!listed) return <GhostPanel panel={panel} />;
  const title = source.manifest(panel.plugin)?.title ?? panel.plugin;
  return (
    <PanelBoundary key={panel.id}>
      {load.error ? (
        <LoadFailed title={title} error={load.error} onRetry={retry} />
      ) : module ? (
        <Mounted mount={module.mount} handle={handle} host={host} />
      ) : (
        <Loading title={title} small={narrow} />
      )}
    </PanelBoundary>
  );
}

// Whether the panel is drawn in a sidebar column — a block, a preview, a rail
// flyout — where the page-sized empty state would be most of the space. A
// pane is in the sidebar unless it has been moved out into a tab; a preview's
// pane is in no layout at all and is in the sidebar too.
function useNarrow(panel: Panel): boolean {
  const layout = useLayout();
  return panel.kind === 'pane' && placementOf(layout, panel.id).zone !== 'main';
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
function Loading({ title, small }: { title: string; small: boolean }) {
  return (
    <EmptyState
      size={small ? 'sm' : undefined}
      icon={<Loader size={36} label={`Loading ${title}`} />}
      title={`Loading ${title}…`}
    />
  );
}

// The module never arrived: an unreachable remote, a bad bundle, a missing
// export. Nothing of the plugin has run, so pressing Try again fetches it
// again in place. The boundary below is the other failure — the plugin's
// own code threw while rendering — and cannot be retried by fetching.
function LoadFailed({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
}) {
  return (
    <Alert
      className={styles.panelAlert}
      color="red"
      trace={error.message}
      actions={
        <Button variant="link" size="sm" onClick={onRetry}>
          <ArrowCounterClockwise size={12} /> Try again
        </Button>
      }
    >
      <strong>{title} could not be loaded.</strong>
    </Alert>
  );
}

// A panel with nothing to draw, in the two ways that happens, which read
// differently because only one of them is likely to end. A plugin the index
// has no manifest for may be listed again the next time the registry is
// fetched, and the layout holds its place meanwhile. A plugin whose manifest
// lists no panel of this kind is installed and current: the place is being
// held for something no reload will bring.
//
// Either way the control that gives the place up is here, because this box is
// the whole of what the reader can see of the panel. In the sidebar that
// control unpins: `close` refuses a pinned pane (core/reduce.ts, `close`), so
// a Close button here would do nothing.
function GhostPanel({ panel }: { panel: Panel }) {
  const { source } = useServices();
  const layout = useLayout();
  const run = useRun();
  const manifest = source.manifest(panel.plugin);
  const inSidebar = placementOf(layout, panel.id).zone === 'sidebar';
  const small = useNarrow(panel);
  const what = panel.kind === 'pane' ? 'sidebar pane' : 'page';
  const here = inSidebar ? 'This block' : 'This tab';
  const { label, taking, leave } = inSidebar
    ? {
        label: 'Unpin',
        taking: 'Unpinning',
        leave: () => void run('workbench:unpin', { plugin: panel.plugin }),
      }
    : {
        label: 'Close',
        taking: 'Closing',
        leave: () => void run('workbench:close', { panel: panel.id }),
      };
  return (
    <EmptyState
      size={small ? 'sm' : undefined}
      icon={manifest ? <Placeholder size={32} /> : <Plug size={32} />}
      title={manifest ? `${manifest.title} has no ${what}` : `${panel.plugin} is not installed`}
      description={
        manifest
          ? `${manifest.title} is installed and has no ${what} to draw. ${taking} removes ${here.toLowerCase()}.`
          : `${here} is held for it, so reinstalling brings the ${what} back here. ${taking} gives the place up.`
      }
      action={
        <Button variant="outline" onClick={leave}>
          {label}
        </Button>
      }
    />
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

  // Clearing the error remounts the children, so the plugin's `mount` runs
  // again on a fresh element: the panel starts over from the module already
  // in memory, which is why the action is a restart and not a fetch.
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Alert
        className={styles.panelAlert}
        color="red"
        trace={this.state.error.message}
        actions={
          <Button variant="link" size="sm" onClick={() => this.setState({ error: null })}>
            <ArrowCounterClockwise size={12} /> Restart panel
          </Button>
        }
      >
        <strong>This panel crashed.</strong>
      </Alert>
    );
  }
}
