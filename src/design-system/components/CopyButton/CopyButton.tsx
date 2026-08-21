import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, XCircle } from '@phosphor-icons/react';
import copyToClipboard from 'copy-to-clipboard';
import styles from './CopyButton.module.scss';
import { cx } from '../../util/cx';
import { Button, type ButtonProps } from '../Button';

/** How long the result shows before the button returns to its resting state. */
const RESULT_MS = 1500;

type Result = 'idle' | 'copied' | 'failed';

export interface CopyButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
  /** What lands on the clipboard. */
  text: string;
  /** The button's text. Omit for an icon-only button, which needs `label`. */
  children?: string;
  /** The accessible name. Required when there are no words to read. */
  label?: string;
  /** What the live region says on success. Defaults to "Copied". */
  confirmation?: string;
}

export function CopyButton({
  text,
  children,
  label,
  confirmation = 'Copied',
  className,
  ...props
}: CopyButtonProps) {
  const [result, setResult] = useState<Result>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cancel a pending reset if the button unmounts first.
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    // navigator.clipboard is undefined on insecure origins. The library
    // falls back to execCommand, including the selection handling iOS needs.
    const ok = await copyToClipboard(text);
    setResult(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setResult('idle'), RESULT_MS);
  }, [text]);

  const Glyph = result === 'copied' ? Check : result === 'failed' ? XCircle : Copy;

  return (
    <>
      <Button
        onClick={copy}
        aria-label={children ? undefined : label}
        className={cx(styles.btn, result === 'failed' && styles.failed, className)}
        {...props}
      >
        <Glyph weight="bold" aria-hidden />
        {children}
      </Button>
      {/* The icon is aria-hidden, so this is the only announcement. */}
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {result === 'copied' ? confirmation : result === 'failed' ? 'Copy failed' : ''}
      </span>
    </>
  );
}
