import styles from './Loader.module.scss';
import { cx } from '../../util/cx';

export interface LoaderProps {
  /** Rendered width/height in px */
  size?: number;
  /** The mark blends into what is behind it, so it needs to know the ground it
   *  sits on. Defaults to the theme's own; set this only when placing the
   *  loader on something that disagrees with it — a filled banner, an image. */
  ground?: 'light' | 'dark';
  /** Apply an SVG filter (e.g. "url(#deutan)" for CVD simulation) */
  svgFilter?: string;
  /** Accessible label. When set, the wrapping element gets
   *  role="status" + aria-label so screen readers announce loading. */
  label?: string;
  className?: string;
}

export function Loader({ size = 48, ground, svgFilter, label, className }: LoaderProps) {
  return (
    <span
      className={cx(styles.root, ground && styles[ground], className)}
      role={label ? 'status' : undefined}
      aria-label={label}
    >
      <svg
        className={styles.loader}
        viewBox="0 0 48 48"
        width={size}
        height={size}
        aria-hidden="true"
        filter={svgFilter}
      >
        <circle cx="17" cy="28" r="11" />
        <circle cx="24" cy="16" r="11" />
        <circle cx="31" cy="28" r="11" />
      </svg>
    </span>
  );
}
