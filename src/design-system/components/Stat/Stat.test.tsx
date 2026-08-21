import { render, screen } from '@testing-library/react';
import { Stat } from './Stat';

describe('Stat', () => {
  it('shows a value the caller has already formatted', () => {
    render(<Stat value="$1,284.50" label="est. cost" />);
    expect(screen.getByText('$1,284.50')).toBeInTheDocument();
    expect(screen.getByText('est. cost')).toBeInTheDocument();
  });

  it('shows a zero rather than treating it as absent', () => {
    render(<Stat value={0} label="downloads" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
