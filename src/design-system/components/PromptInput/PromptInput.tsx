import type { ReactNode } from 'react';
import { PaperPlaneRight, Stop } from '@phosphor-icons/react';
import * as Field from '../Field';
import { Frame } from '../Frame';
import { Button } from '../Button';
import { Alert } from '../Alert';
import { Textarea } from '../Textarea';
import type { TextareaProps } from '../Textarea';
import { useSubmitMode, useHardwareKeyboard, type SubmitOn } from '../../util/useSubmitMode';
import styles from './PromptInput.module.scss';
import { cx } from '../../util/cx';

export interface PromptInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** Names the field. Hidden unless `labelVisible`. */
  label: string;
  labelVisible?: boolean;
  placeholder?: string;
  /**
   * A line under the field. Defaults to the submit gesture the device can
   * actually reach. Pass `null` for none. Announced when focus arrives, so
   * changing it while the field is focused is silent.
   */
  hint?: ReactNode;
  /** Announced when it appears. */
  error?: ReactNode;
  submitOn?: SubmitOn;
  /**
   * For a composer against a container edge, where an outer focus ring would
   * overflow.
   */
  flush?: boolean;
  /**
   * Send becomes stop. The field stays editable, so the next message can be
   * written while this one runs.
   */
  busy?: boolean;
  /** Interrupts the running turn. Without one, `busy` only changes the icon. */
  onStop?: () => void;
  /** Replaces the send button, in every state. */
  action?: ReactNode;
  /**
   * A row inside the surface, below the field and left of Send — the
   * composer's own controls (a destination, a picker), like an email's
   * To line.
   */
  footer?: ReactNode;
  disabled?: boolean;
  maxRows?: number;
  autoFocus?: boolean;
  className?: string;
  /**
   * Spread onto the field, for a completion popup's combobox wiring
   * (`role`, `aria-*`) and its key handling. The component's own props win.
   */
  fieldProps?: Omit<TextareaProps, 'value' | 'onValueChange' | 'onSubmit'>;
}

export function PromptInput({
  value,
  onValueChange,
  onSubmit,
  label,
  labelVisible,
  placeholder,
  hint,
  error,
  submitOn = 'enter',
  flush,
  busy,
  onStop,
  action,
  footer,
  disabled,
  maxRows = 6,
  autoFocus,
  className,
  fieldProps,
}: PromptInputProps) {
  const empty = !value.trim();
  const mode = useSubmitMode(submitOn);
  // No hint without a hardware keyboard: there is no keystroke to describe,
  // and the button is the only way to submit.
  const defaultHint = !useHardwareKeyboard()
    ? null
    : mode === 'enter'
      ? 'Enter to send · Shift+Enter for a new line'
      : 'Ctrl/⌘+Enter to send · Enter for a new line';
  const hintText = hint === undefined ? defaultHint : hint;

  return (
    <Field.Root className={cx(styles.root, className)}>
      <Field.Label className={cx(!labelVisible && styles.srOnly)}>{label}</Field.Label>

      <Frame
        paddingY={2}
        paddingX={4}
        className={cx(styles.surface, footer != null && styles.withFooter, flush && styles.flush)}
      >
        <Textarea
          {...fieldProps}
          rows={1}
          autoGrow
          maxRows={maxRows}
          submitOn={submitOn}
          value={value}
          onValueChange={onValueChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={styles.field}
        />
        {footer && <div className={styles.footerStart}>{footer}</div>}
        {action ??
          (busy ? (
            <Button variant="primary" size="sm" onClick={onStop} className={styles.send}>
              <Stop size={14} weight="fill" aria-hidden="true" />
              <span className={styles.srOnly}>Stop</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              // aria-disabled rather than disabled, which would take the
              // button out of the tab order. The click is a no-op instead.
              aria-disabled={empty || disabled}
              onClick={() => !empty && !disabled && onSubmit(value)}
              className={styles.send}
            >
              <PaperPlaneRight size={14} weight="bold" aria-hidden="true" />
              <span className={styles.srOnly}>Send</span>
            </Button>
          ))}
      </Frame>

      {/* A control that changes its accessible name is not announced for it,
          even while focused, so send becoming stop would pass unremarked. Kept
          out of the button, whose own name has to stay the action. */}
      <span role="status" className={styles.srOnly}>
        {busy && !action ? 'Running. Send is now stop.' : ''}
      </span>

      {hintText && <Field.Description className={styles.hint}>{hintText}</Field.Description>}
      {error && <Alert color="red">{error}</Alert>}
    </Field.Root>
  );
}
