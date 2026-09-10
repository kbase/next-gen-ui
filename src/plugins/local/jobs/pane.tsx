import { useSyncExternalStore } from 'react';
import { Chip } from '@kbase/design-system';
import { definePane, fromReact, useHost, usePanelTitle } from '@kbase/plugin-sdk';
import { COLORS, jobStore } from './store';

function JobList() {
  usePanelTitle('Jobs');
  useSyncExternalStore(jobStore.subscribe, jobStore.version, jobStore.version);
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
            onClick={() => host.openRoute(`/${job.id}`)}
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

export default definePane(fromReact(JobList));
