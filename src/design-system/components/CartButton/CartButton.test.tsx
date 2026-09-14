import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartButton } from './CartButton';

describe('CartButton', () => {
  it('is a toggle that keeps its name and reports its state', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<CartButton onPressedChange={onPressedChange} />);

    const button = screen.getByRole('button', { name: 'Add to cart' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
    expect(button).toHaveAttribute('aria-pressed', 'true');
    // The name does not change; aria-pressed says it is in.
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBe(button);
  });

  it('is controlled when pressed is given', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<CartButton pressed={false} onPressedChange={onPressedChange} />);

    await user.click(screen.getByRole('button'));
    expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows its words on hover, outside the button', async () => {
    const user = userEvent.setup();
    render(<CartButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('');

    await user.hover(button);
    const popup = await screen.findByText('Add to cart', { ignore: false });
    expect(button).not.toContainElement(popup);
    // The popup pictures the trigger, so the trigger stays the only announcement.
    expect(popup.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(button).toHaveTextContent('');
  });

  it('follows the state in its words', async () => {
    const user = userEvent.setup();
    render(<CartButton defaultPressed />);

    await user.hover(screen.getByRole('button'));
    expect(await screen.findByText('In cart', { ignore: false })).toBeInTheDocument();
  });

  it('presses the button when the popup is clicked', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<CartButton onPressedChange={onPressedChange} />);

    await user.hover(screen.getByRole('button'));
    // fireEvent, not user.click: user-event's simulated pointer leaves the
    // trigger before it lands, and without layout jsdom cannot tell that it
    // landed on the popup, so the tooltip closes first.
    fireEvent.click(await screen.findByText('Add to cart', { ignore: false }));
    expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('keeps the words in the button when labelled', async () => {
    const user = userEvent.setup();
    render(<CartButton labelled />);

    const button = screen.getByRole('button', { name: 'Add to cart' });
    expect(button).toHaveTextContent('Add to cart');

    await user.click(button);
    expect(screen.getByRole('button', { name: 'In cart' })).toBe(button);

    // The words are already there; there is no popup to open.
    await user.hover(button);
    expect(screen.getAllByText('In cart')).toHaveLength(1);
  });
});
