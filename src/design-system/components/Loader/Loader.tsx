import type { CSSProperties } from 'react';
import styles from './Loader.module.scss';
import { useInView } from '../../util/useInView';
import { cx } from '../../util/cx';

/* Blending puts each circle on its own compositing layer; only transforms
   animate, so frames recomposite without repainting. Out of view the
   animation is paused. */

export interface LoaderProps {
  /** Rendered width/height in px */
  size?: number;
  /** How the circles composite where they overlap. Follows the theme unless
   *  set — multiply on light, screen on dark. Set it for a surface that does
   *  not follow the theme: a brand fill, an image. */
  blend?: 'multiply' | 'screen';
  /** Apply an SVG filter (e.g. "url(#deutan)" for CVD simulation) */
  svgFilter?: string;
  /** Accessible label. When set, the wrapping element gets
   *  role="status" + aria-label so screen readers announce loading. */
  label?: string;
  className?: string;
}

export function Loader({ size = 48, blend, svgFilter, label, className }: LoaderProps) {
  const [ref, inView] = useInView<HTMLSpanElement>();

  return (
    <span
      ref={ref}
      className={cx(styles.root, className)}
      data-paused={inView ? undefined : ''}
      style={blend ? ({ '--loader-blend': blend } as CSSProperties) : undefined}
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
        <circle cx="13" cy="24" r="9" />
        <circle cx="24" cy="24" r="9" />
        <circle cx="35" cy="24" r="9" />
      </svg>
    </span>
  );
}
