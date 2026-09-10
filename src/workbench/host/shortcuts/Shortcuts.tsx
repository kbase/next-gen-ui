import { useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import { Tooltip, Button, Toolbar } from '@kbase/design-system';
import { qualifyCommand, usePanelTitle } from '../../../plugins/sdk';
import type { CommandCall } from '../../../plugins/sdk';
import { useBusy, useRun, useServices } from '../../react/context';
import { iconFor } from '../icons';
import styles from './Shortcuts.module.css';

// The host's shortcut panel: every installed plugin's manifest `shortcuts`,
// as buttons. Reads the host index directly, which no plugin over the SDK
// can; runs through the registry, which loads the owning plugin's module on
// first use.
export function ShortcutsNavigator() {
  usePanelTitle('Shortcuts');
  const { source, registry } = useServices();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  useSyncExternalStore(registry.subscribe, () => registry.list().length);
  const shortcuts = source.manifests().flatMap((m) =>
    (m.shortcuts ?? []).map((call) => {
      const name = qualifyCommand(call.command, m.id);
      const declared = registry.get(name);
      return {
        key: `${m.id}/${call.command}`,
        name,
        call,
        title: declared?.title ?? call.label,
        // A command without its own icon wears its plugin's: provenance.
        Icon: iconFor(m.commands?.find((c) => c.name === declared?.name)?.icon ?? m.icon, m.color),
      };
    }),
  );

  if (shortcuts.length === 0) {
    return <p className={`caption ${styles.empty}`}>No plugin offers shortcuts.</p>;
  }
  return (
    <Tooltip.Provider delay={300}>
      <Toolbar.Root className={styles.list} aria-label="Shortcuts">
        {shortcuts.map(({ key, ...s }) => (
          <Shortcut key={key} {...s} />
        ))}
      </Toolbar.Root>
    </Tooltip.Provider>
  );
}

function Shortcut({
  name,
  call,
  title,
  Icon,
}: {
  name: string;
  call: CommandCall;
  title: string;
  Icon: ComponentType<IconProps>;
}) {
  const run = useRun();
  const busy = useBusy(name);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Toolbar.Button
            render={<Button size="xs" variant="outline" />}
            aria-busy={busy || undefined}
            disabled={busy}
            onClick={() => void run(name, call.args)}
          />
        }
      >
        <Icon size={14} aria-hidden="true" />
        {call.label}
      </Tooltip.Trigger>
      <Tooltip.Popup>{title}</Tooltip.Popup>
    </Tooltip.Root>
  );
}
