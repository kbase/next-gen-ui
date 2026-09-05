import { useSyncExternalStore } from 'react';
import { CaretRight } from '@phosphor-icons/react';
import type { PanelId } from '../core';
import { makePanel } from '../core';
import { useDispatch, useLayout, useServices } from './context';
import styles from './Workbench.module.css';

// The trail a panel declares, above the panel and below its group's tabs.
// A tab says which of the open things this is; a trail says where you are
// inside it, so the two are written separately and often say different
// words about the same panel. A panel that declares no trail gets no row
// and no gap: the group is one row shorter.
export function Breadcrumbs({ panel }: { panel: PanelId }) {
  const { crumbs: store } = useServices();
  const layout = useLayout();
  const dispatch = useDispatch();
  useSyncExternalStore(store.subscribe, store.version, store.version);
  const crumbs = store.get(panel);
  if (crumbs.length === 0) return null;
  const plugin = layout.panels[panel]?.plugin;

  return (
    <nav className={styles.crumbs} aria-label="Breadcrumbs">
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className={styles.crumb}>
            {i > 0 && <CaretRight size={11} className={styles.crumbSep} aria-hidden="true" />}
            {crumb.action && plugin && !last ? (
              <button
                type="button"
                className={styles.crumbLink}
                onClick={() =>
                  dispatch({
                    type: 'open',
                    panel: makePanel(plugin, 'document', crumb.action ?? {}),
                  })
                }
              >
                {crumb.label}
              </button>
            ) : (
              <span className={styles.crumbHere} aria-current={last ? 'page' : undefined}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
