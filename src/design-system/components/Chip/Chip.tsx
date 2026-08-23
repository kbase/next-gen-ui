import type { Icon } from '@phosphor-icons/react';
import { X } from '@phosphor-icons/react';
import styles from './Chip.module.scss';
import { cx } from '../../util/cx';

export type ChipColor =
  | 'neutral'
  | 'primary'
  | 'teal'
  | 'ocean'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'purple';

export interface ChipProps {
  color: ChipColor;
  /** The chip's words. Omit for a decorative chip, which is then not announced. */
  label?: string;
  /** Sized by the chip and hidden from screen readers; `label` names it. */
  icon?: Icon;
  /** Hide the words, keeping them for screen readers. Requires `icon`. */
  iconOnly?: boolean;
  /** Use on-white tint when inside a white card/frame. No effect on `neutral`, which has no tint. */
  onWhite?: boolean;
  /** Drops the box, leaving icon and text in the chip's color. */
  bare?: boolean;
  /** When provided, renders an X dismiss button. */
  onDismiss?: () => void;
  className?: string;
}

export function Chip({
  color,
  label,
  icon: Glyph,
  iconOnly,
  onWhite,
  bare,
  onDismiss,
  className,
}: ChipProps) {
  return (
    <span
      className={cx(
        styles.chip,
        styles[color],
        onWhite && styles.onWhite,
        bare && styles.bare,
        className,
      )}
    >
      {Glyph && <Glyph size={9} weight="bold" aria-hidden />}
      {/* Hidden, not removed, so the name survives iconOnly. */}
      {label && <span className={cx(iconOnly && Glyph && styles.srOnly)}>{label}</span>}
      {onDismiss && (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Remove">
          <X size={8} weight="bold" aria-hidden />
        </button>
      )}
    </span>
  );
}
