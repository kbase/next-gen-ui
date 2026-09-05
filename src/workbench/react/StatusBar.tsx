import { useSyncExternalStore } from 'react';
import { LockSimple, SidebarSimple } from '@phosphor-icons/react';
import { Button } from '@kbase/design-system';
import type { StatusItem } from '../../plugins/sdk';
import { useDispatch, useLayout, useRun, useServices, useTitle } from './context';
import styles from './Workbench.module.css';

export function StatusBar() {
  const layout = useLayout();
  const dispatch = useDispatch();
  const { source } = useServices();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const focused = layout.focus ? layout.panels[layout.focus] : undefined;
  const title = useTitle(focused, layout.focus ?? '');
  const collapsed = layout.sidebar.collapsed;
  // Status hooks exist only on loaded modules; a plugin that has not run yet
  // has nothing to say.
  const withStatus = source
    .manifests()
    .map((m) => ({ id: m.id, hook: source.loaded(m.id)?.useStatus }))
    .filter((entry): entry is { id: string; hook: () => StatusItem[] } => !!entry.hook);

  return (
    <div className={styles.statusBar} aria-label="Status bar">
      <Button
        size="xs"
        variant="ghost"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        onClick={() => dispatch({ type: 'sidebar', collapsed: !collapsed })}
      >
        <SidebarSimple size={14} aria-hidden="true" />
      </Button>
      {layout.locked && (
        <span className={`caption ${styles.lockedNote}`}>
          <LockSimple size={12} aria-hidden="true" />
          Layout locked
        </span>
      )}
      {withStatus.map(({ id, hook }) => (
        <PluginStatus key={id} useStatus={hook} />
      ))}
      <span className={styles.spacer} />
      {focused && <span className="caption">{title}</span>}
    </div>
  );
}

function PluginStatus({ useStatus }: { useStatus: () => StatusItem[] }) {
  const items = useStatus();
  const run = useRun();
  return (
    <>
      {items.map((item, i) =>
        item.command ? (
          <button
            key={i}
            type="button"
            className={styles.statusItem}
            onClick={() => void run(item.command!)}
          >
            {item.text}
          </button>
        ) : (
          <span key={i} className={`caption ${styles.statusItem}`}>
            {item.text}
          </span>
        ),
      )}
    </>
  );
}
