import { useSyncExternalStore } from 'react';
import { Button, Toolbar } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import { useRun, useServices } from '../../react/context';
import { iconFor } from '../icons';
import styles from './Shortcuts.module.css';

// The host's shortcut panel: every installed plugin's manifest commands
// flagged `shortcut`, as buttons. Reads the host index directly, which no
// plugin over the SDK can; runs through the registry, which loads the
// owning plugin's module on first use.
export function ShortcutsNavigator() {
  usePanelTitle('Shortcuts');
  const { source } = useServices();
  const run = useRun();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const shortcuts = source.manifests().flatMap((m) =>
    (m.commands ?? [])
      .filter((c) => c.shortcut)
      .map((c) => ({
        key: `${m.id}/${c.name}`,
        name: c.name,
        label: typeof c.shortcut === 'string' ? c.shortcut : c.title,
        title: c.title,
        // A command without its own icon wears its plugin's: provenance.
        icon: c.icon ?? m.icon,
        color: m.color,
      })),
  );

  if (shortcuts.length === 0) {
    return <p className={`caption ${styles.empty}`}>No plugin offers shortcuts.</p>;
  }
  return (
    <Toolbar.Root className={styles.list} aria-label="Shortcuts">
      {shortcuts.map((s) => {
        const Icon = iconFor(s.icon, s.color);
        return (
          <Toolbar.Button
            key={s.key}
            render={<Button size="xs" variant="outline" />}
            title={s.title}
            onClick={() => void run(s.name)}
          >
            <Icon size={14} aria-hidden="true" />
            {s.label}
          </Toolbar.Button>
        );
      })}
    </Toolbar.Root>
  );
}
