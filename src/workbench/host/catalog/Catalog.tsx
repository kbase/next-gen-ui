import { useSyncExternalStore } from 'react';
import { Chip, Radio, Switch } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
import { useDispatch, useLayout, useServices } from '../../react/context';
import { iconFor } from '../icons';
import styles from './Catalog.module.css';

// The host's own page: what is installed, what is pinned, and which plugin
// answers the prompt bar. Reaches host services directly, which no plugin
// over the SDK can.
export function CatalogDocument() {
  usePanelTitle('Catalog');
  const { source, settings } = useServices();
  const layout = useLayout();
  const dispatch = useDispatch();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const current = useSyncExternalStore(settings.subscribe, settings.get, settings.get);
  const manifests = source.manifests().filter((m) => m.id !== 'catalog');
  const assistants = manifests.filter((m) => m.promptHandler);

  return (
    <div className={styles.root}>
      <section aria-labelledby="catalog-installed" className={styles.section}>
        <h2 id="catalog-installed" className="h4">
          Installed
        </h2>
        <ul className={styles.list}>
          {manifests.map((m) => {
            const Icon = iconFor(m.icon, m.color);
            const pinned = layout.sidebar.pinned.includes(m.id);
            const loaded = !!source.loaded(m.id);
            return (
              <li key={m.id} className={styles.row}>
                <span className={styles.rowIcon} aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span className={styles.rowTitle}>
                  <span className="body">{m.title}</span>
                  {loaded && <Chip color="green" label="loaded" />}
                </span>
                {m.navigator && (
                  <span className={styles.rowControls}>
                    <span className="caption">Pinned</span>
                    <Switch
                      checked={pinned}
                      onCheckedChange={(v) =>
                        dispatch(
                          v ? { type: 'pin', plugin: m.id } : { type: 'unpin', plugin: m.id },
                        )
                      }
                      aria-label={`Pin ${m.title} to the sidebar`}
                    />
                  </span>
                )}
                {m.description && <p className={`caption ${styles.rowDesc}`}>{m.description}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="catalog-assistant" className={styles.section}>
        <h2 id="catalog-assistant" className="h4">
          Assistant
        </h2>
        <p className="caption">Which plugin answers free text typed in the prompt bar.</p>
        <Radio.Group
          aria-labelledby="catalog-assistant"
          value={current.assistant ?? 'none'}
          onValueChange={(value) =>
            settings.set({ assistant: value === 'none' ? null : String(value) })
          }
          style={{ display: 'grid', gap: 'var(--s-2)' }}
        >
          {assistants.map((m) => (
            <label key={m.id} className={styles.assistantRow}>
              <Radio.Radio value={m.id} />
              <span className="body">{m.title}</span>
            </label>
          ))}
          <label className={styles.assistantRow}>
            <Radio.Radio value="none" />
            <span className="body">None</span>
          </label>
        </Radio.Group>
      </section>
    </div>
  );
}
