import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: 'table', label: 'Table' },
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
];

function Harness() {
  const [value, setValue] = useState('table');
  return (
    <>
      <button type="button">before</button>
      <SegmentedControl aria-label="Layout" options={OPTIONS} value={value} onChange={setValue} />
      <button type="button">after</button>
    </>
  );
}

describe('SegmentedControl', () => {
  it('is one tab stop, not one per segment', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByText('before')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Table' })).toHaveFocus();
    await user.tab();
    expect(screen.getByText('after')).toHaveFocus();
  });

  it('moves and selects with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowRight}');

    const grid = screen.getByRole('radio', { name: 'Grid' });
    expect(grid).toHaveFocus();
    expect(grid).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Table' })).not.toBeChecked();
  });

  it('names an icon-only segment from its label', () => {
    render(
      <SegmentedControl
        aria-label="Layout"
        options={[{ value: 'grid', label: 'Grid', icon: <svg /> }]}
        value="grid"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeInTheDocument();
  });
});
