import { useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { hueFor, iconFor } from '../host/icons';
import type { PanelId } from '../core';
import { useDispatch, useLayout, useServices } from './context';
import styles from './Workbench.module.css';

// The trail a panel declares, above the panel and below its group's tabs.
// A tab says which of the open things this is; a trail says where you are
// inside it, so the two are written separately and often say different
// words about the same panel. A panel that declares no trail gets no row
// and no gap: the group is one row shorter.
export function Breadcrumbs({ panel }: { panel: PanelId }) {
  const { crumbs: store, source } = useServices();
  const layout = useLayout();
  const dispatch = useDispatch();
  useSyncExternalStore(store.subscribe, store.version, store.version);
  const crumbs = store.get(panel);
  if (crumbs.length === 0) return null;
  const plugin = layout.panels[panel]?.plugin;
  // A crumb's mark takes the plugin's own colour, the same way the launcher
  // tints it (Home.tsx:162). Without it `iconFor` leaves the glyph untinted and
  // a plugin naming itself in its trail draws in plain ink.
  const tint = source.manifests().find((m) => m.id === plugin)?.color;
  // The bar wears the plugin's colour too, not just the mark. A trail is the
  // one row that is always on screen while a plugin's panel is, so it is where
  // whose-panel-this-is belongs. The hue reaches the bar and the first crumb —
  // the plugin's own name — and stops: the crumbs after it are places inside
  // the plugin, and colouring those would say the hue meant something else.
  const hue = hueFor(tint);

  return (
    <nav
      className={styles.crumbs}
      aria-label="Breadcrumbs"
      style={
        hue
          ? ({
              '--crumb-tint': hue.tint,
              '--crumb-edge': hue.edge,
              '--crumb-ink': hue.ink,
            } as CSSProperties)
          : undefined
      }
    >
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        const Mark = crumb.icon ? iconFor(crumb.icon, tint) : null;
        const body = (
          <>
            {Mark && <Mark size={12} className={styles.crumbIcon} aria-hidden="true" />}
            {crumb.label}
          </>
        );
        return (
          <span key={`${crumb.label}-${i}`} className={i === 0 ? styles.crumbFirst : styles.crumb}>
            {i > 0 && <CaretRight size={11} className={styles.crumbSep} aria-hidden="true" />}
            {crumb.path !== undefined && plugin && !last ? (
              // A crumb is a level inside this panel, so pressing it moves
              // this panel there rather than opening another.
              <button
                type="button"
                className={styles.crumbLink}
                onClick={() => dispatch({ type: 'setPath', panel, path: crumb.path! })}
              >
                {body}
              </button>
            ) : (
              <span className={styles.crumbHere} aria-current={last ? 'page' : undefined}>
                {body}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
