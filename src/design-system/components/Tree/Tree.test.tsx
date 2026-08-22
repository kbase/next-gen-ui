import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Root as Tree } from './Tree';

const ITEMS = [
  {
    id: 'genomes',
    label: 'Genomes',
    children: [{ id: 'ecoli', label: 'E. coli K-12' }],
  },
];

describe('Tree', () => {
  it('expands a branch itself when uncontrolled', async () => {
    render(<Tree items={ITEMS} />);
    expect(screen.queryByText('E. coli K-12')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Genomes'));

    expect(screen.getByText('E. coli K-12')).toBeInTheDocument();
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

  it('reports a branch closing as well as opening', async () => {
    const onExpandedChange = vi.fn();
    render(<Tree items={ITEMS} expanded={['genomes']} onExpandedChange={onExpandedChange} />);

    await userEvent.click(screen.getByText('Genomes'));

    expect(onExpandedChange).toHaveBeenCalledWith([]);
  });
});
