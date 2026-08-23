import { useState } from 'react';
import { JobPanel } from '../components/JobPanel';
import { NotificationFeed, type NotificationItem } from '../components/NotificationFeed';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import s from './appendix-shared.module.scss';

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'success',
    title: 'Assembly complete',
    message: '12,847 contigs assembled.',
    timestamp: 'Today',
    read: false,
    action: { label: 'View results', onClick: () => {} },
  },
  {
    id: '2',
    type: 'error',
    title: 'Annotation failed',
    message: 'OOM killed at stage 3.',
    timestamp: 'Today',
    read: false,
    action: { label: 'View job', onClick: () => {} },
  },
  {
    id: '3',
    type: 'info',
    title: 'Workspace shared',
    message: 'Alex Smith shared "Rhizosphere Analysis" with you.',
    timestamp: 'Yesterday',
    read: true,
  },
  {
    id: '4',
    type: 'warning',
    title: 'Approaching quota',
    message: '4.2 / 5 GB used.',
    timestamp: 'Yesterday',
    read: true,
  },
];

export function JobsNotificationsAppendix() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const dismiss = (id: string) => setNotifications((n) => n.filter((x) => x.id !== id));
  const markRead = (id: string) =>
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));

  return (
    <div className={s.root}>
      <div className={s.num}>B</div>
      <div className={s.title}>Jobs & Notifications</div>
      <p className={s.desc}>
        Not a component. Apps compose JobPanel, NotificationFeed, and existing primitives for their
        context.
      </p>
      <p className={s.note}>
        Jobs are user-initiated and report progress. Notifications are system events and do not.
      </p>

      <Table>
        <Thead>
          <Tr>
            <Th>Aspect</Th>
            <Th>Job</Th>
            <Th>Notification</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>Initiated by</Td>
            <Td>User action</Td>
            <Td>System event</Td>
          </Tr>
          <Tr>
            <Td>Has progress</Td>
            <Td>Yes (bar + stages)</Td>
            <Td>No</Td>
          </Tr>
          <Tr>
            <Td>Persistent</Td>
            <Td>Until complete/canceled</Td>
            <Td>Until dismissed</Td>
          </Tr>
          <Tr>
            <Td>Actions</Td>
            <Td>Cancel, Retry, View Cell</Td>
            <Td>Dismiss, action link</Td>
          </Tr>
          <Tr>
            <Td>Error state</Td>
            <Td>Red border + severity actions</Td>
            <Td>Row icon color</Td>
          </Tr>
          <Tr>
            <Td>Container</Td>
            <Td>Frame panel</Td>
            <Td>Frame feed list</Td>
          </Tr>
        </Tbody>
      </Table>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-6)',
          marginTop: 'var(--s-7)',
        }}
      >
        <JobPanel
          status="running"
          title="Genome annotation pipeline"
          submitted="45 min ago"
          elapsed="45:12"
          progress={68}
          stages={[
            { label: 'Assembly', status: 'complete' },
            { label: 'Quality filtering', status: 'complete' },
            { label: 'Prokka annotation', status: 'running' },
            { label: 'Upload results', status: 'queued' },
          ]}
          onCancel={() => {}}
          cellId="cell-7"
          onViewCell={() => {}}
        />

        <JobPanel
          status="error"
          title="Marine sediment MAG binning"
          submitted="1 hour ago"
          elapsed="0:47:22"
          stages={[
            { label: 'Assembly', status: 'complete' },
            { label: 'Binning', status: 'error' },
            { label: 'Annotation', status: 'queued' },
          ]}
          logLines={[
            '[14:23:01] Starting MetaBAT2 binning...',
            '[15:10:23] ERROR: Memory limit exceeded',
            '[15:10:23] Process killed (OOM, exit 137)',
          ]}
          onRetry={() => {}}
        />

        <JobPanel
          status="queued"
          title="Soil metagenome annotation"
          submitted="2 min ago"
          onCancel={() => {}}
        />

        <JobPanel
          status="canceled"
          title="Transcriptome differential expression"
          submitted="20 min ago"
          elapsed="3:41"
          stages={[
            { label: 'Alignment', status: 'complete' },
            { label: 'Quantification', status: 'queued' },
          ]}
          onRetry={() => {}}
        />
      </div>

      <div style={{ marginTop: 'var(--s-8)' }}>
        <NotificationFeed
          notifications={notifications}
          onDismiss={dismiss}
          onMarkRead={markRead}
          onClearAll={() => setNotifications([])}
        />
      </div>
    </div>
  );
}
