import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './Loader.module.scss';
import { cx } from '../../util/cx';

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

/* The circles blend where they overlap, which puts each one on its own
   compositing layer, and they animate their fill, which stops the layer being
   cached. A page holding several off-screen loaders pays for all of them every
   frame, so the animation is paused whenever the loader is out of view. */
function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '200px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

export function Loader({ size = 48, blend, svgFilter, label, className }: LoaderProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);

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
        <circle cx="17" cy="28" r="11" />
        <circle cx="24" cy="16" r="11" />
        <circle cx="31" cy="28" r="11" />
      </svg>
    </span>
  );
}
