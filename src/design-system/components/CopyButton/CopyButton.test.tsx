import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import copyToClipboard from 'copy-to-clipboard';
import styles from './CopyButton.module.scss';
import { CopyButton } from './CopyButton';

// Mocked at the library boundary: jsdom does not implement isSecureContext,
// so the library uses execCommand and never touches navigator.clipboard.
vi.mock('copy-to-clipboard', () => ({ default: vi.fn() }));
const copyMock = vi.mocked(copyToClipboard);

describe('CopyButton', () => {
  beforeEach(() => copyMock.mockReset());

  it('passes its text to the clipboard', async () => {
    copyMock.mockResolvedValue(true);

    render(<CopyButton text="s3://bucket/key" label="Copy path" />);
    await userEvent.click(screen.getByRole('button', { name: /copy path/i }));

    expect(copyMock).toHaveBeenCalledWith('s3://bucket/key');
  });

  it('announces success, which the icon alone cannot', async () => {
    copyMock.mockResolvedValue(true);

    render(<CopyButton text="x" label="Copy path" />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole('button', { name: /copy path/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));
  });

  it('says so when the copy fails', async () => {
    // False when execCommand is unavailable or permission is denied.
    copyMock.mockResolvedValue(false);

    render(<CopyButton text="x" label="Copy path" />);
    await userEvent.click(screen.getByRole('button', { name: /copy path/i }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copy failed'));
  });

  it('goes back to resting after the result', async () => {
    // Real timers: fake ones deadlock with user-event's async click.
    copyMock.mockResolvedValue(true);

    render(<CopyButton text="x" label="Copy path" />);
    await userEvent.click(screen.getByRole('button', { name: /copy path/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));

    await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement(), {
      timeout: 3000,
    });
  });

  it('keeps its name when the words are hidden', () => {
    render(<CopyButton text="x" label="Copy instruction" iconOnly />);
    expect(screen.getByRole('button', { name: 'Copy instruction' })).toBeInTheDocument();
    // The class itself, because a mistyped key resolves to undefined, cx drops
    // it, and the words render visibly with every other assertion still green.
    expect(screen.getByText('Copy instruction')).toHaveClass(styles.srOnly);
  });
});
