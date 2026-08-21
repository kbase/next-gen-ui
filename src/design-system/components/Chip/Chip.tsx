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
  /**
   * The chip's words. Omit it for a chip that is decoration — one whose
   * meaning the row beside it already carries — so it stays silent instead of
   * saying the same thing twice.
   */
  label?: string;
  /**
   * Drawn at the chip's own size and hidden from screen readers, since `label`
   * already names the chip.
   */
  icon?: Icon;
  /**
   * Draw the icon alone. The label stays for screen readers, so a tight row
   * can drop the word without dropping the name. Needs an `icon`.
   */
  iconOnly?: boolean;
  /** Use on-white tint when inside a white card/frame. No effect on `neutral`, which has no tint. */
  onWhite?: boolean;
  /** Drops the box, leaving icon and text in the chip's colour. */
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
      {/* Hidden rather than dropped: the name is the same either way, so the
          same call works in a wide row and a narrow one. No label at all is a
          chip that says nothing, which is what decoration should do. */}
      {label && <span className={cx(iconOnly && Glyph && styles.srOnly)}>{label}</span>}
      {onDismiss && (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Remove">
          <X size={8} weight="bold" aria-hidden />
        </button>
      )}
    </span>
  );
}
