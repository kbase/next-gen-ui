import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Root as Tree } from './Tree';

const ITEMS = [
  {
    id: 'genomes',
    label: 'Genomes',
    children: [{ id: 'ecoli', label: 'E. coli K-12' }],
  },
  {
    id: 'assemblies',
    label: 'Assemblies',
    children: [{ id: 'spades', label: 'SPAdes run' }],
  },
];

describe('Tree', () => {
  it('expands a branch itself when uncontrolled', async () => {
    render(<Tree items={ITEMS} />);
    expect(screen.queryByText('E. coli K-12')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Genomes'));

    expect(screen.getByText('E. coli K-12')).toBeInTheDocument();
  });

  it('takes a name', () => {
    render(<Tree items={ITEMS} aria-label="Project files" />);

    expect(screen.getByRole('tree', { name: 'Project files' })).toBeInTheDocument();
  });

  it('shows the branches the parent lists', () => {
    render(<Tree items={ITEMS} expanded={['genomes']} />);

    expect(screen.getByText('E. coli K-12')).toBeInTheDocument();
  });

  it('does not expand itself when controlled', async () => {
    const onExpandedChange = vi.fn();
    render(<Tree items={ITEMS} expanded={[]} onExpandedChange={onExpandedChange} />);

    await userEvent.click(screen.getByText('Genomes'));

    expect(onExpandedChange).toHaveBeenCalledWith(['genomes']);
    expect(screen.queryByText('E. coli K-12')).not.toBeInTheDocument();
  });

  it('reports the change when uncontrolled too', async () => {
    const onExpandedChange = vi.fn();
    render(<Tree items={ITEMS} onExpandedChange={onExpandedChange} />);

    await userEvent.click(screen.getByText('Genomes'));

    expect(onExpandedChange).toHaveBeenCalledWith(['genomes']);
    expect(screen.getByText('E. coli K-12')).toBeInTheDocument();
  });

  it('composes two uncontrolled toggles landing in one batch', async () => {
    const onExpandedChange = vi.fn();
    render(<Tree items={ITEMS} onExpandedChange={onExpandedChange} />);

    // One batch, so the second toggle has to see the first's result.
    await act(async () => {
      screen.getByText('Genomes').click();
      screen.getByText('Assemblies').click();
    });

    expect(onExpandedChange).toHaveBeenLastCalledWith(['genomes', 'assemblies']);
  });

  it('asks to open again when the parent does not apply the change', async () => {
    const onExpandedChange = vi.fn();
    render(<Tree items={ITEMS} expanded={[]} onExpandedChange={onExpandedChange} />);

    await userEvent.click(screen.getByText('Genomes'));
    await userEvent.click(screen.getByText('Genomes'));

    // The branch is still collapsed, so the second click is not a close.
    expect(onExpandedChange.mock.calls).toEqual([[['genomes']], [['genomes']]]);
  });

  it('reports a branch closing as well as opening', async () => {
    const onExpandedChange = vi.fn();
    render(<Tree items={ITEMS} expanded={['genomes']} onExpandedChange={onExpandedChange} />);

    await userEvent.click(screen.getByText('Genomes'));

    expect(onExpandedChange).toHaveBeenCalledWith([]);
  });
});
