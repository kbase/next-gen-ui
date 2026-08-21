import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import copyToClipboard from 'copy-to-clipboard';
import { CopyButton } from './CopyButton';

// Mocked at the library boundary: under jsdom isSecureContext is false, so
// the library uses execCommand and never touches navigator.clipboard.
vi.mock('copy-to-clipboard', () => ({ default: vi.fn() }));
const copyMock = vi.mocked(copyToClipboard);

describe('CopyButton', () => {
  beforeEach(() => copyMock.mockReset());

  it('passes its text to the clipboard', async () => {
    copyMock.mockResolvedValue(true);

    render(<CopyButton text="s3://bucket/key">copy</CopyButton>);
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));

    expect(copyMock).toHaveBeenCalledWith('s3://bucket/key');
  });

  it('announces success, which the icon alone cannot', async () => {
    copyMock.mockResolvedValue(true);

    render(<CopyButton text="x">copy</CopyButton>);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));
  });

  it('says so when the copy fails', async () => {
    // False when execCommand is unavailable or permission is denied.
    copyMock.mockResolvedValue(false);

    render(<CopyButton text="x">copy</CopyButton>);
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copy failed'));
  });

  it('goes back to resting after the result', async () => {
    // Real timers: fake ones deadlock with user-event's async click.
    copyMock.mockResolvedValue(true);

    render(<CopyButton text="x">copy</CopyButton>);
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));

    await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement(), {
      timeout: 3000,
    });
  });

  it('names an icon-only button', () => {
    render(<CopyButton text="x" label="Copy instruction" />);
    expect(screen.getByRole('button', { name: 'Copy instruction' })).toBeInTheDocument();
  });
});
