import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { Crumb } from '../../plugins/sdk';
import type { Layout, Operation, Panel, PanelId, Snapshot } from '../core';
import type { ArgValues } from '../commands';
import { qualifiedName } from '../commands';
import { fallbackTitle } from '../host/services';
import type { WorkbenchServices } from '../host/services';

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

// For the two syncs, which have to know what caused the arrangement they
// are reacting to. Anything that only draws the arrangement wants
// `useLayout`: the snapshot is a new object on every operation, including
// the ones that left the cause alone.
export function useSnapshot(): Snapshot {
  const { store } = useServices();
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}

// The one dispatch that announces what it changed, reached without a
// component naming `services` for it.
export function useDispatch(): (op: Operation) => boolean {
  return useServices().dispatch;
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
