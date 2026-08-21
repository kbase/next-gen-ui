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
    // scrollHeight is the content box; the element is border-box, so the
    // borders have to be added back or the field ends up one line short.
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, []);

  // Runs after every render rather than on input, so a value set from outside
  // grows the field too.
  useLayoutEffect(() => {
    if (autoGrow) measure();
  }, [autoGrow, measure, value, props.defaultValue]);

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
      onKeyDown={handleKeyDown}
      style={autoGrow ? { maxHeight: `calc(${maxRows} * 1lh + 2 * var(--s-2))`, ...style } : style}
      {...props}
    />
  );
}
