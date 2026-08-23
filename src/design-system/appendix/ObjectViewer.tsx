import type { ReactNode } from 'react';
import styles from './ObjectViewer.module.scss';
import s from './appendix-shared.module.scss';
import { cx } from '../util/cx';
import { Frame } from '../components/Frame';
import { TypeBadge } from '../components/TypeBadge';
import type { TypeBadgeColor } from '../components/TypeBadge';
import { Avatar } from '../components/Avatar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import type { BreadcrumbItem } from '../components/Breadcrumbs';
import * as Tabs from '../components/Tabs';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';

export interface ObjectViewerTab {
  label: string;
  content: ReactNode;
}

export interface ObjectViewerProps {
  type: { abbr: string; color: TypeBadgeColor };
  name: string;
  version?: string;
  owner?: string;
  ownerInitials?: string;
  created?: string;
  metadata?: Record<string, string>;
  tabs?: ObjectViewerTab[];
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function ObjectViewer({
  type,
  name,
  version,
  owner,
  ownerInitials,
  created,
  metadata,
  tabs,
  breadcrumbs,
  className,
}: ObjectViewerProps) {
  const allTabs: ObjectViewerTab[] = [
    ...(tabs ?? []),
    ...(metadata
      ? [
          {
            label: 'Metadata',
            content: (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Key</Th>
                    <Th>Value</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(metadata).map(([k, v]) => (
                    <Tr key={k}>
                      <Td>
                        <span className={styles.metaKey}>{k}</span>
                      </Td>
                      <Td>
                        <span className={styles.metaVal}>{v}</span>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={cx(styles.root, className)}>
      {breadcrumbs && (
        <div className={styles.breadcrumbs}>
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}
      <Frame padding={0}>
        <div className={styles.header}>
          <TypeBadge color={type.color}>{type.abbr}</TypeBadge>
          <div className={styles.headerContent}>
            <div className={styles.titleRow}>
              <span className={styles.name}>{name}</span>
              {version && <span className={styles.version}>{version}</span>}
            </div>
            {(owner || created) && (
              <div className={styles.meta}>
                {owner && (
                  <span className={styles.owner}>
                    <Avatar size={24} initials={ownerInitials ?? owner.slice(0, 2).toUpperCase()} />
                    {owner}
                  </span>
                )}
                {created && <span className={styles.timestamp}>{created}</span>}
              </div>
            )}
          </div>
        </div>

        {allTabs.length > 0 && (
          <Tabs.Root defaultValue={allTabs[0].label}>
            <div className={styles.tabBar}>
              <Tabs.List>
                {allTabs.map((t) => (
                  <Tabs.Tab key={t.label} value={t.label}>
                    {t.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </div>
            {allTabs.map((t) => (
              <Tabs.Panel key={t.label} value={t.label}>
                <div className={styles.tabContent}>{t.content}</div>
              </Tabs.Panel>
            ))}
          </Tabs.Root>
        )}
      </Frame>
    </div>
  );
}

export function ObjectViewerAppendix() {
  return (
    <div className={s.root}>
      <div className={s.num}>D</div>
      <div className={s.title}>Object viewer pattern</div>
      <p className={s.desc}>
        Not a component. Apps compose TypeBadge, Avatar, Breadcrumbs, Tabs, and Table into a
        type-aware object view.
      </p>
      <p className={s.note}>
        Tab content comes from the app. The Metadata tab is generated from the key-value pairs
        passed in.
      </p>

      <div style={{ marginTop: 'var(--s-7)' }}>
        <ObjectViewer
          type={{ abbr: 'Gn', color: 'primary' }}
          name="Escherichia coli K-12 MG1655"
          version="ver 3/1"
          owner="Jane Doe"
          ownerInitials="JD"
          created="2 hours ago"
          breadcrumbs={[
            { label: 'Workspaces', href: '#' },
            { label: 'Soil Analysis', href: '#' },
            { label: 'E. coli K-12' },
          ]}
          tabs={[
            {
              label: 'Overview',
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
                  <div
                    className="note"
                    style={{ display: 'flex', gap: 'var(--s-7)', flexWrap: 'wrap' }}
                  >
                    <div>
                      <span className="mono-value">4,639</span> features
                    </div>
                    <div>
                      <span className="mono-value">4.6 Mb</span> total
                    </div>
                    <div>
                      <span className="mono-value">50.8%</span> GC
                    </div>
                  </div>
                  <div className="body">
                    Complete genome for <span className="italic">Escherichia coli</span> str. K-12
                    substr. MG1655. Reference strain.
                  </div>
                </div>
              ),
            },
          ]}
          metadata={{
            'Object ID': 'ws:45221/3/1',
            Type: 'KBaseGenomes.Genome-17.0',
            Size: '4.6 Mb',
            'GC Content': '50.79%',
            Features: '4,639',
          }}
        />
      </div>
    </div>
  );
}
