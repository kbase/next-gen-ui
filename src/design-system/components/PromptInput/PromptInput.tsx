import type { ReactNode } from 'react';
import { PaperPlaneRight } from '@phosphor-icons/react';
import * as Field from '../Field';
import { Frame } from '../Frame';
import { Button } from '../Button';
import { Alert } from '../Alert';
import { Textarea, type SubmitOn } from '../Textarea';
import styles from './PromptInput.module.scss';
import { cx } from '../../util/cx';

export interface PromptInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** Names the field. Hidden unless `labelVisible`; a placeholder is not a name. */
  label: string;
  labelVisible?: boolean;
  placeholder?: string;
  /**
   * A line under the field, for the submit gesture or a caveat. Announced once
   * when focus arrives, so changing it while the field is focused is silent.
   */
  hint?: ReactNode;
  /** Announced when it appears. Say what failed and what to do about it. */
  error?: ReactNode;
  submitOn?: SubmitOn;
  /**
   * For a composer sitting against a container edge: a rule instead of a
   * border, and the focus ring inset, where an outer one would overflow.
   */
  flush?: boolean;
  /** Replaces the send button. */
  action?: ReactNode;
  disabled?: boolean;
  maxRows?: number;
  autoFocus?: boolean;
  className?: string;
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
  action,
  disabled,
  maxRows = 6,
  autoFocus,
  className,
}: PromptInputProps) {
  const empty = !value.trim();

  return (
    <Field.Root className={cx(styles.root, className)}>
      <Field.Label className={cx(!labelVisible && styles.srOnly)}>{label}</Field.Label>

      <Frame paddingY={5} paddingX={6} className={cx(styles.surface, flush && styles.flush)}>
        <Textarea
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
        {action ?? (
          <Button
            variant="primary"
            size="sm"
            // Kept focusable while blank, so it can say why it is inert. The
            // click is a no-op instead.
            aria-disabled={empty || disabled}
            onClick={() => !empty && !disabled && onSubmit(value)}
            className={styles.send}
          >
            <PaperPlaneRight size={14} weight="bold" aria-hidden="true" />
            <span className={styles.srOnly}>Send</span>
          </Button>
        )}
      </Frame>

      {hint && <Field.Description className={styles.hint}>{hint}</Field.Description>}
      {error && <Alert color="red">{error}</Alert>}
    </Field.Root>
  );
}
