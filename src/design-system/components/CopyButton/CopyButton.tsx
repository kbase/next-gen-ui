import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, XCircle } from '@phosphor-icons/react';
import copyToClipboard from 'copy-to-clipboard';
import styles from './CopyButton.module.scss';
import { cx } from '../../util/cx';
import { Button, type ButtonProps } from '../Button';

/** How long the result shows before resetting. */
const RESULT_MS = 1500;

type Result = 'idle' | 'copied' | 'failed';

export interface CopyButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
  /** The text to copy. */
  text: string;
  /** The button's words. Name what is being copied, not just "Copy". */
  label: string;
  /** Draw the icon alone, keeping the words for screen readers. */
  iconOnly?: boolean;
  /** What the live region says on success. Defaults to "Copied". */
  confirmation?: string;
}

export function CopyButton({
  text,
  label,
  iconOnly,
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
      <Button onClick={copy} className={cx(styles.btn, className)} {...props}>
        <Glyph weight="bold" aria-hidden />
        {/* Hidden rather than removed, so iconOnly keeps the name. */}
        <span className={cx(iconOnly && styles.srOnly)}>{label}</span>
      </Button>
      {/* The icon is aria-hidden, so this is the only announcement. */}
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {result === 'copied' ? confirmation : result === 'failed' ? 'Copy failed' : ''}
      </span>
    </>
  );
}
