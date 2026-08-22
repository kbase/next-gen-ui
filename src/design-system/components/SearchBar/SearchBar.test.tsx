import { render, screen } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('styles the field rather than the input inside it', () => {
    render(<SearchBar value="" onValueChange={() => {}} style={{ marginBottom: '10px' }} />);

    const input = screen.getByRole('textbox');
    // On the input, a margin lands inside the pill and inflates its height.
    expect(input).not.toHaveStyle({ marginBottom: '10px' });
    expect(input.parentElement).toHaveStyle({ marginBottom: '10px' });
  });
});
