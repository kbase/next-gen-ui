import { useCallback, useLayoutEffect, useRef } from 'react';
import { Input as BaseInput } from '@base-ui/react/input';
import styles from './Textarea.module.scss';
import { cx } from '../../util/cx';
import { useSubmitMode, type SubmitOn } from '../../util/useSubmitMode';

export type { SubmitOn };

/* CSS sizes the field where the property is supported; measure() is the
   fallback. Read once — support does not change within a document. */
const CSS_SIZED = typeof CSS !== 'undefined' && !!CSS.supports?.('field-sizing', 'content');

/* onSubmit is omitted and redefined: a textarea never fires a native submit
   event, so the DOM prop is dead here and the name is the one consumers reach
   for. */
export interface TextareaProps extends Omit<BaseInput.Props, 'className' | 'render' | 'onSubmit'> {
  rows?: number;
  /** Grows with its content rather than scrolling, up to `maxRows`. */
  autoGrow?: boolean;
  /** Ceiling for `autoGrow`, in rows. Defaults to 8. Past it the field scrolls. */
  maxRows?: number;
  /** Called with the current value. Never with a blank one. */
  onSubmit?: (value: string) => void;
  /**
   * `'enter'` submits on Enter and breaks the line on Shift+Enter;
   * `'modifier'` breaks the line on Enter and submits on Ctrl/⌘+Enter.
   * A soft keyboard has neither modifier, so it always gets `'modifier'`.
   */
  submitOn?: SubmitOn;
  className?: string;
}

/* Base UI's Input part rendered as a textarea, so Field.Root supplies the id,
   label and description wiring. */
export function Textarea({
  rows,
  autoGrow,
  maxRows,
  onSubmit,
  submitOn = 'enter',
  onKeyDown,
  onInput,
  value,
  className,
  style,
  ...props
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const mode = useSubmitMode(submitOn);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Collapse first, or scrollHeight only ever reports the current height.
    el.style.height = 'auto';
    // A field in a hidden container measures zero; drop the pin rather than
    // freezing it shut, and let the next input re-measure.
    if (el.scrollHeight === 0) {
      el.style.height = '';
      return;
    }
    // scrollHeight is content plus padding; the element is border-box, so the
    // borders have to be added back or the field ends up a line short. The
    // ceiling is max-height in the stylesheet, which clamps this.
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!autoGrow) {
      // Drop the pinned height, or `resize` has nothing to move.
      el.style.height = '';
      return;
    }
    // Set on the element rather than merged into `style`, which Base UI also
    // allows to be a function of state. Left unset, the stylesheet's default
    // applies, so the number lives in one place.
    if (maxRows != null) el.style.setProperty('--textarea-max-rows', String(maxRows));
    // Where field-sizing applies, a pinned height would override it.
    if (!CSS_SIZED) measure();
    // `value` covers a controlled field set from outside. Typing is handled by
    // onInput, which is the only trigger an uncontrolled field has.
  }, [autoGrow, maxRows, measure, value]);

  const handleInput: NonNullable<BaseInput.Props['onInput']> = (event) => {
    onInput?.(event);
    if (autoGrow && !CSS_SIZED) measure();
  };

  // Typed from the Input part: the events it emits say HTMLInputElement even
  // where the rendered element is a textarea.
  const handleKeyDown: NonNullable<BaseInput.Props['onKeyDown']> = (event) => {
    onKeyDown?.(event);
    if (!onSubmit || event.defaultPrevented || event.key !== 'Enter') return;
    // Both guards are an IME: mid-composition Enter commits the candidate, and
    // Safari reports the committing keystroke as 229 with isComposing already
    // false.
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;

    const modifier = event.ctrlKey || event.metaKey;
    if (mode === 'enter' ? event.shiftKey || modifier : !modifier) return;

    // Before the blank check, so a submit keystroke does not insert a newline
    // when there is nothing to send.
    event.preventDefault();
    const next = event.currentTarget.value;
    if (next.trim()) onSubmit(next);
  };

  return (
    <BaseInput
      render={<textarea ref={ref} rows={rows} />}
      className={cx(styles.textarea, autoGrow && styles.autoGrow, className)}
      // Labels the return key on a soft keyboard, and only where it sends.
      enterKeyHint={onSubmit && mode === 'enter' ? 'send' : undefined}
      value={value}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      style={style}
      {...props}
    />
  );
}
