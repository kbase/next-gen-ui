import { render, screen } from '@testing-library/react';
import { JobPanel, type JobStatus } from './JobPanel';

const STATUSES: { status: JobStatus; label: string }[] = [
  { status: 'queued', label: 'Queued' },
  { status: 'running', label: 'Running' },
  { status: 'complete', label: 'Complete' },
  { status: 'error', label: 'Error' },
  { status: 'canceled', label: 'Canceled' },
];

describe('JobPanel', () => {
  // Every state, because the status map is looked up unguarded: a renamed or
  // missing key is a runtime throw, not a type error, for anyone passing a
  // string through from an API.
  it.each(STATUSES)('renders $status', ({ status, label }) => {
    render(<JobPanel status={status} title="Genome annotation" submitted="2 min ago" />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('Genome annotation')).toBeInTheDocument();
  });

  it('offers cancel while active and retry once it has failed', () => {
    const { rerender } = render(
      <JobPanel status="running" title="Binning" submitted="now" onCancel={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

    rerender(<JobPanel status="error" title="Binning" submitted="now" onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
