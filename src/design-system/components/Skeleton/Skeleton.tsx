import styles from './Skeleton.module.scss';
import { useInView } from '../../util/useInView';
import { cx } from '../../util/cx';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

/* A loading screen holds many of these, so the pulse is paused out of view
   rather than repainting every frame. */

export function Skeleton({ width, height, variant = 'text', className }: SkeletonProps) {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-paused={inView ? undefined : ''}
      className={cx(styles.skeleton, styles[variant], className)}
      style={{ width, height }}
    />
  );
}
