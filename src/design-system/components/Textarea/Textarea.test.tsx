import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';
import { setMedia } from '../../../test/setup';

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

  it('does not submit a blank or whitespace-only value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Textarea aria-label="Prompt" onSubmit={onSubmit} />);
    const el = screen.getByLabelText('Prompt');

    await user.click(el);
    await user.keyboard('{Enter}');
    await user.keyboard('   {Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    // The submit key does not fall through to a newline either.
    expect(el).toHaveValue('   ');
  });

  it('breaks the line on Enter and submits on Ctrl+Enter in modifier mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Textarea aria-label="Prompt" submitOn="modifier" onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Prompt'));
    await user.keyboard('a{Enter}b');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('a\nb');
  });

  it('submits on Meta+Enter in modifier mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Textarea aria-label="Prompt" submitOn="modifier" onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Prompt'));
    await user.keyboard('hi{Meta>}{Enter}{/Meta}');

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('hi');
  });

  it('ignores Ctrl+Enter in enter mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Textarea aria-label="Prompt" onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Prompt'));
    await user.keyboard('hi{Control>}{Enter}{/Control}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('falls back to modifier mode without a fine pointer', async () => {
    setMedia('(any-pointer: fine)', false);
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Textarea aria-label="Prompt" submitOn="enter" onSubmit={onSubmit} />);
    const el = screen.getByLabelText('Prompt');

    await user.click(el);
    await user.keyboard('a{Enter}b');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(el).toHaveValue('a\nb');

    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('a\nb');
  });

  it('labels the return key as send only where Enter sends', () => {
    const { rerender } = render(<Textarea aria-label="Prompt" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Prompt')).toHaveAttribute('enterkeyhint', 'send');

    rerender(<Textarea aria-label="Prompt" submitOn="modifier" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Prompt')).not.toHaveAttribute('enterkeyhint');

    rerender(<Textarea aria-label="Prompt" />);
    expect(screen.getByLabelText('Prompt')).not.toHaveAttribute('enterkeyhint');
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
