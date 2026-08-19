import type { ReactNode, CSSProperties } from 'react';
import styles from './Frame.module.scss';
import { cx } from '../../util/cx';

export type FramePadding = 'none' | 'sm' | 'md' | 'lg';

export interface FrameProps {
  children: ReactNode;
  /** none when the content pads itself, as a table or an EmptyState does. */
  padding?: FramePadding;
  className?: string;
  style?: CSSProperties;
}

export function Frame({ children, padding = 'md', className, style }: FrameProps) {
  return (
    <div className={cx(styles.frame, styles[padding], className)} style={style}>
      {children}
    </div>
  );
}
