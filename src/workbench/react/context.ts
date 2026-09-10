import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { Crumb } from '../../plugins/sdk';
import type { Layout, Operation, Panel, PanelId } from '../core';
import type { ArgValues } from '../commands';
import { qualifiedName } from '../commands';
import type { WorkbenchServices } from './services';

export const ServicesContext = createContext<WorkbenchServices | null>(null);

export function useServices(): WorkbenchServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('workbench components need a WorkbenchProvider');
  return services;
}

export function useLayout(): Layout {
  const { store } = useServices();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function useDispatch(): (op: Operation) => boolean {
  const { store, announcer } = useServices();
  return useCallback(
    (op: Operation) => {
      const result = store.dispatch(op);
      if (result.changed) announcer.announce(result.announcement);
      return result.changed;
    },
    [store, announcer],
  );
}

// Runs a command on the user's behalf. The invoking control can watch
// `useBusy` while it runs; a rejection becomes a toast naming the command,
// and the live region hears it too.
export function useRun(): (name: string, values?: ArgValues) => Promise<void> {
  const { registry, announcer, runs, toasts } = useServices();
  return useCallback(
    async (name: string, values: ArgValues = {}) => {
      const found = registry.find(name);
      const key = found.ok ? qualifiedName(found.command) : name;
      runs.start(key);
      try {
        await registry.run(name, values, 'user');
      } catch (err) {
        const message = err instanceof Error ? err.message : `/${name} failed`;
        toasts.add({
          title: `/${found.ok ? found.command.name : name} failed`,
          description: message,
        });
        announcer.announce(message);
      } finally {
        runs.end(key);
      }
    },
    [registry, announcer, runs, toasts],
  );
}

// Whether a command, named bare or qualified, is running right now.
export function useBusy(name: string): boolean {
  const { registry, runs } = useServices();
  useSyncExternalStore(runs.subscribe, runs.version, runs.version);
  const found = registry.find(name);
  return runs.running(found.ok ? qualifiedName(found.command) : name);
}

// The placeholder shown before a panel supplies its own title: the plugin's
// title, then the path when there is one worth showing.
export function fallbackTitle(services: WorkbenchServices, panel: Panel | undefined, id: PanelId) {
  if (!panel) return id;
  const plugin = services.source.plugins().find((p) => p.id === panel.plugin);
  const base = plugin?.title ?? panel.plugin;
  return panel.path && panel.path !== '/' ? `${base}: ${panel.path}` : base;
}

export function useCrumbs(id: PanelId): Crumb[] {
  const { crumbs } = useServices();
  useSyncExternalStore(crumbs.subscribe, crumbs.version, crumbs.version);
  return crumbs.get(id);
}

export function useTitle(panel: Panel | undefined, id: PanelId = panel?.id ?? ''): string {
  const services = useServices();
  const { titles } = services;
  useSyncExternalStore(titles.subscribe, titles.version, titles.version);
  return titles.get(id) ?? fallbackTitle(services, panel, id);
}
