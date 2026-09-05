import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { Crumb } from '../../plugins/sdk';
import type { Layout, Operation, Panel, PanelId } from '../core';
import type { ArgValues } from '../commands';
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

export function useRun(): (name: string, values?: ArgValues) => Promise<void> {
  const { registry, announcer } = useServices();
  return useCallback(
    async (name: string, values: ArgValues = {}) => {
      try {
        await registry.run(name, values);
      } catch (err) {
        announcer.announce(err instanceof Error ? err.message : `/${name} failed`);
      }
    },
    [registry, announcer],
  );
}

// The placeholder shown before a panel supplies its own title: the plugin's
// title, then the panel's params in declaration order.
export function fallbackTitle(services: WorkbenchServices, panel: Panel | undefined, id: PanelId) {
  if (!panel) return id;
  const plugin = services.source.plugins().find((p) => p.id === panel.plugin);
  const base = plugin?.title ?? panel.plugin;
  const values = Object.values(panel.params);
  return values.length ? `${base}: ${values.join(' ')}` : base;
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
