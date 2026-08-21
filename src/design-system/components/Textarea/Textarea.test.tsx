import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

/* jsdom does no layout, so the three metrics autoGrow reads are stubbed:
   20px a line plus 8px of padding, and a 1px border each side. */
function stubLayout() {
  const proto = window.HTMLTextAreaElement.prototype;
  const define = (name: string, get: (this: HTMLTextAreaElement) => number) =>
    Object.defineProperty(proto, name, { configurable: true, get });
  define('scrollHeight', function () {
    return this.value.split('\n').length * 20 + 8;
  });
  define('clientHeight', () => 100);
  define('offsetHeight', () => 102);
  return () => {
    for (const name of ['scrollHeight', 'clientHeight', 'offsetHeight']) {
      delete (proto as unknown as Record<string, unknown>)[name];
    }
  };
}

describe('Textarea', () => {
  it('submits on Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Textarea aria-label="Prompt" onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Prompt'));
    await user.keyboard('hello{Enter}');

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('hello');
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

  it('leaves Enter alone when no onSubmit is given', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Prompt" />);

    await user.click(screen.getByLabelText('Prompt'));
    await user.keyboard('a{Enter}b');

    expect(screen.getByLabelText('Prompt')).toHaveValue('a\nb');
  });

  it('grows an uncontrolled field as it is typed', async () => {
    const restore = stubLayout();
    try {
      const user = userEvent.setup();
      render(<Textarea aria-label="Prompt" autoGrow />);
      const el = screen.getByLabelText('Prompt');

      // The inline value, not the computed one: jsdom does not lay out.
      expect(el.style.height).toBe('30px');
      await user.click(el);
      await user.keyboard('a{Shift>}{Enter}{/Shift}b{Shift>}{Enter}{/Shift}c');

      expect(el.style.height).toBe('70px');
    } finally {
      restore();
    }
  });

  it('releases the pinned height when autoGrow is turned off', () => {
    const restore = stubLayout();
    try {
      const { rerender } = render(<Textarea aria-label="Prompt" autoGrow />);
      const el = screen.getByLabelText('Prompt');
      expect(el.style.height).not.toBe('');

      rerender(<Textarea aria-label="Prompt" />);
      expect(el.style.height).toBe('');
    } finally {
      restore();
    }
  });
});
