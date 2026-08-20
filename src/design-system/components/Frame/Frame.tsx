import type { ReactNode, CSSProperties } from 'react';
import styles from './Frame.module.scss';
import { cx } from '../../util/cx';

/** A step on the spacing scale; 0 is no padding. */
export type FrameSpace = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface FrameProps {
  children: ReactNode;
  /** Defaults to 7, which tokens.css calls the frame's padding. */
  padding?: FrameSpace;
  /** Overrides padding on one axis. */
  paddingX?: FrameSpace;
  paddingY?: FrameSpace;
  className?: string;
  style?: CSSProperties;
}

const space = (v: FrameSpace) => (v === 0 ? '0' : `var(--s-${v})`);

export function Frame({ children, padding = 7, paddingX, paddingY, className, style }: FrameProps) {
  return (
    <div
      className={cx(styles.frame, className)}
      style={{
        // The logical properties, so the axes follow the writing mode.
        paddingBlock: space(paddingY ?? padding),
        paddingInline: space(paddingX ?? padding),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
