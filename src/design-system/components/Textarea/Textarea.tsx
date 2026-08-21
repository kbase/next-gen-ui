import { useCallback, useLayoutEffect, useRef } from 'react';
import { Input as BaseInput } from '@base-ui/react/input';
import styles from './Textarea.module.scss';
import { cx } from '../../util/cx';

export interface TextareaProps extends Omit<BaseInput.Props, 'className' | 'render'> {
  rows?: number;
  /** Grows with its content rather than scrolling, up to `maxRows`. */
  autoGrow?: boolean;
  /** Ceiling for `autoGrow`. Past it the field scrolls. */
  maxRows?: number;
  /** Called on Enter. Shift+Enter still inserts a newline. */
  onSubmit?: () => void;
  className?: string;
}

/* Base UI's Input part rendered as a textarea, so Field.Root supplies the id,
   label and description wiring. */
export function Textarea({
  rows,
  autoGrow,
  maxRows = 8,
  onSubmit,
  onKeyDown,
  onInput,
  value,
  className,
  style,
  ...props
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Collapse first, or scrollHeight only ever reports the current height.
    el.style.height = 'auto';
    // A field in a hidden container measures zero; leave it be rather than
    // pinning it shut until the next keystroke.
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
    // allows to be a function of state.
    el.style.setProperty('--textarea-max-rows', String(maxRows));
    measure();
    // `value` covers a controlled field set from outside; typing is handled by
    // onInput below, which an uncontrolled field never reaches this effect for.
  }, [autoGrow, maxRows, measure, value]);

  const handleInput: NonNullable<BaseInput.Props['onInput']> = (event) => {
    onInput?.(event);
    if (autoGrow) measure();
  };

  // Typed from the Input part: the events it emits say HTMLInputElement even
  // where the rendered element is a textarea.
  const handleKeyDown: NonNullable<BaseInput.Props['onKeyDown']> = (event) => {
    onKeyDown?.(event);
    if (!onSubmit || event.defaultPrevented) return;
    // isComposing guards an IME: mid-composition Enter commits the candidate.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <BaseInput
      render={<textarea ref={ref} rows={rows} />}
      className={cx(styles.textarea, autoGrow && styles.autoGrow, className)}
      value={value}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      style={style}
      {...props}
    />
  );
}
