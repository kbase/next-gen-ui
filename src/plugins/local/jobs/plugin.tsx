import { useSyncExternalStore } from 'react';
import { Button, Chip, Progress } from '@kbase/design-system';
import type { ChipColor } from '@kbase/design-system';
import { definePlugin, useHost, usePanel, usePanelTitle } from '@kbase/plugin-sdk';
import type { StatusItem } from '@kbase/plugin-sdk';
import type { JobStatus } from './store';
import { jobStore } from './store';

const COLORS: Record<JobStatus, ChipColor> = {
  queued: 'neutral',
  running: 'purple',
  done: 'green',
  cancelled: 'neutral',
  failed: 'red',
};

function useJobs() {
  return useSyncExternalStore(jobStore.subscribe, jobStore.version, jobStore.version);
}

function JobsNavigator() {
  usePanelTitle('Jobs');
  useJobs();
  const host = useHost();
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 'var(--s-2)',
        display: 'grid',
        gap: 'var(--s-1)',
      }}
    >
      {jobStore.all().map((job) => (
        <li key={job.id}>
          <button
            type="button"
            onClick={() => host.openDocument({ id: job.id })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--s-3)',
              padding: 'var(--s-2) var(--s-3)',
              background: 'none',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              color: 'inherit',
              font: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <span>
              <span className="body">{job.name}</span>
              <span className="caption" style={{ display: 'block' }}>
                #{job.id} · {job.app}
              </span>
            </span>
            <Chip color={COLORS[job.status]} label={job.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function JobDocument() {
  const { params } = usePanel();
  useJobs();
  const host = useHost();
  const job = jobStore.get(params.id);
  usePanelTitle(job ? `Job ${job.id}: ${job.name}` : `Job ${params.id}`);
  if (!job) {
    return (
      <div style={{ padding: 'var(--s-5)' }}>
        <p className="body">No job has the id {params.id}.</p>
      </div>
    );
  }
  const cancellable = job.status === 'running' || job.status === 'queued';
  return (
    <div style={{ padding: 'var(--s-5)', display: 'grid', gap: 'var(--s-4)', maxWidth: 560 }}>
      <div>
        <p className="caption">
          #{job.id} · {job.app}
        </p>
        <h1 className="h2">{job.name}</h1>
      </div>
      <Chip color={COLORS[job.status]} label={job.status} />
      <Progress value={Math.round(job.progress * 100)} aria-label="Progress" />
      <div>
        <Button
          variant="danger"
          size="sm"
          disabled={!cancellable}
          onClick={() => void host.runCommand('cancel', { id: job.id })}
        >
          Cancel job
        </Button>
      </div>
    </div>
  );
}

function useStatus(): StatusItem[] {
  useJobs();
  const n = jobStore.running();
  return n > 0 ? [{ text: `${n} running` }] : [];
}

export default definePlugin({
  navigator: JobsNavigator,
  document: JobDocument,
  useStatus,
  commands: {
    cancel: ({ id }) => {
      if (!jobStore.cancel(String(id))) throw new Error(`job ${String(id)} cannot be cancelled`);
    },
  },
});
