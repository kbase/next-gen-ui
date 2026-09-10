import { useSyncExternalStore } from 'react';
import { LockSimple, SidebarSimple } from '@phosphor-icons/react';
import { Button } from '@kbase/design-system';
import type { StatusItem } from '../../plugins/sdk';
import { qualifyCommand } from '../../plugins/sdk';
import { useBusy, useDispatch, useLayout, useRun, useServices, useTitle } from './context';
import styles from './Workbench.module.css';

export function StatusBar() {
  const layout = useLayout();
  const dispatch = useDispatch();
  const { status } = useServices();
  useSyncExternalStore(status.subscribe, status.version, status.version);
  const focused = layout.focus ? layout.panels[layout.focus] : undefined;
  const title = useTitle(focused, layout.focus ?? '');
  const collapsed = layout.sidebar.collapsed;

  return (
    <div className={styles.statusBar} data-density="compact" aria-label="Status bar">
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
      {status.all().map(({ plugin, items }) =>
        items.map((item, i) =>
          item.action ? (
            <StatusAction key={`${plugin}/${i}`} plugin={plugin} item={item} />
          ) : (
            <span key={`${plugin}/${i}`} className={`caption ${styles.statusItem}`}>
              {item.text}
            </span>
          ),
        ),
      )}
      <span className={styles.spacer} />
      {focused && <span className="caption">{title}</span>}
    </div>
  );
}

function StatusAction({ plugin, item }: { plugin: string; item: StatusItem }) {
  const run = useRun();
  const name = qualifyCommand(item.action!.command, plugin);
  const busy = useBusy(name);
  return (
    <button
      type="button"
      className={styles.statusItem}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={() => void run(name, item.action!.args)}
    >
      {item.text}
    </button>
  );
}
