import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput, type PromptInputProps } from './PromptInput';
import { setMedia } from '../../../test/setup';

function Harness({ initial = '', ...props }: Partial<PromptInputProps> & { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <PromptInput
      label="Message"
      value={value}
      onValueChange={setValue}
      onSubmit={props.onSubmit ?? (() => {})}
      {...props}
    />
  );
}

const field = () => screen.getByLabelText('Message');

describe('PromptInput', () => {
  it('names the field without showing the label', () => {
    render(<Harness />);
    expect(field()).toBeInTheDocument();
    expect(screen.getByText('Message')).toHaveClass(/srOnly/);
  });

  it('shows the label when asked', () => {
    render(<Harness labelVisible />);
    expect(screen.getByText('Message')).not.toHaveClass(/srOnly/);
  });

  it('sends from the button', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness initial="hello" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('hello');
  });

  it('leaves the send button focusable while blank, and inert', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const send = screen.getByRole('button', { name: 'Send' });

    expect(send).toHaveAttribute('aria-disabled', 'true');
    expect(send).not.toBeDisabled();

    send.focus();
    expect(send).toHaveFocus();

    await user.click(send);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('describes the field with the hint', () => {
    render(<Harness hint="Enter to send" />);
    expect(field()).toHaveAccessibleDescription('Enter to send');
  });

  it('announces an error', () => {
    render(<Harness error="Could not send." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not send.');
  });

  it('sends on Enter by default', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(field());
    await user.keyboard('hi{Enter}');

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('hi');
  });

  it('sends on Ctrl+Enter in modifier mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness submitOn="modifier" onSubmit={onSubmit} />);

    await user.click(field());
    await user.keyboard('a{Enter}b');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field()).toHaveValue('a\nb');

    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('a\nb');
  });

  it('offers stop instead of send while busy', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const onSubmit = vi.fn();
    render(<Harness initial="hello" busy onStop={onStop} onSubmit={onSubmit} />);

    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(onStop).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps stop live when the field is blank', () => {
    render(<Harness busy onStop={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Stop' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('announces the swap to stop, and only while it is ours to announce', () => {
    const { rerender } = render(<Harness onStop={vi.fn()} />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    rerender(<Harness busy onStop={vi.fn()} />);
    expect(status).toHaveTextContent('Running. Send is now stop.');

    rerender(<Harness busy action={<button type="button">resume</button>} />);
    expect(status).toBeEmptyDOMElement();
  });

  it('accepts the next message while busy', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness busy onStop={vi.fn()} onSubmit={onSubmit} />);

    await user.click(field());
    await user.keyboard('queue this{Enter}');

    expect(field()).not.toBeDisabled();
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('queue this');
  });

  it('lets action replace the button in both states', () => {
    const { rerender } = render(<Harness action={<button type="button">resume</button>} />);
    expect(screen.getByRole('button', { name: 'resume' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();

    rerender(<Harness busy action={<button type="button">resume</button>} />);
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
  });

  it('makes Enter a newline with no fine pointer, whatever the mode', async () => {
    setMedia('(any-pointer: fine)', false);
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness submitOn="enter" onSubmit={onSubmit} />);

    await user.click(field());
    await user.keyboard('a{Enter}b');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(field()).toHaveValue('a\nb');
  });
});
