import { useSyncExternalStore } from 'react';
import type { PanelId } from '../core';
import { fallbackTitle, useLayout, useServices } from './context';
import { negotiateLabels } from './labels';

// What every tab in one group is called, settled together: a label depends
// on what it sits beside (see negotiateLabels).
export function useGroupLabels(tabs: PanelId[]): Record<PanelId, string> {
  const services = useServices();
  const layout = useLayout();
  const { titles, crumbs } = services;
  useSyncExternalStore(titles.subscribe, titles.version, titles.version);
  useSyncExternalStore(crumbs.subscribe, crumbs.version, crumbs.version);
  return negotiateLabels(
    tabs.map((id) => ({
      id,
      title: titles.get(id) ?? fallbackTitle(services, layout.panels[id], id),
      trail: crumbs.get(id),
    })),
  );
}
