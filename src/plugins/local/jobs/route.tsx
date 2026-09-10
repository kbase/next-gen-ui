import { useSyncExternalStore } from 'react';
import { Button, Chip, Progress } from '@kbase/design-system';
import { defineRoute, fromReact, useHost, usePanel, usePanelTitle } from '@kbase/plugin-sdk';
import { COLORS, idOf, jobStore } from './store';

function JobPage() {
  const { path } = usePanel();
  useSyncExternalStore(jobStore.subscribe, jobStore.version, jobStore.version);
  const host = useHost();
  const id = idOf(path);
  const job = jobStore.get(id);
  usePanelTitle(job ? `Job ${job.id}: ${job.name}` : `Job ${id}`);
  if (!job) {
    return (
      <div style={{ padding: 'var(--s-5)' }}>
        <p className="body">No job has the id {id}.</p>
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
          onClick={() => void host.execute('cancel', { id: job.id })}
        >
          Cancel job
        </Button>
      </div>
    </div>
  );
}

export default defineRoute({ ...fromReact(JobPage), normalize: idOf });
