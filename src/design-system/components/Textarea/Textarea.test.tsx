import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('submits on Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Textarea aria-label="Prompt" onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Prompt'));
    await user.keyboard('hello{Enter}');

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Prompt')).toHaveValue('hello');
  });

  it('inserts a newline on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Textarea aria-label="Prompt" onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Prompt'));
    await user.keyboard('a{Shift>}{Enter}{/Shift}b');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Prompt')).toHaveValue('a\nb');
  });

  it('leaves Enter alone when there is nothing to submit', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Prompt" />);

    await user.click(screen.getByLabelText('Prompt'));
    await user.keyboard('a{Enter}b');

    expect(screen.getByLabelText('Prompt')).toHaveValue('a\nb');
  });
});
