import type { ReactNode, CSSProperties } from 'react';
import styles from './Frame.module.scss';
import { cx } from '../../util/cx';

/** A step on the spacing scale, or none. */
export type FrameSpace =
  | 'none'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12';

export interface FrameProps {
  children: ReactNode;
  /** Defaults to 7, which tokens.css names as the frame's padding. */
  padding?: FrameSpace;
  /** Overrides padding on one axis. */
  paddingBlock?: FrameSpace;
  paddingInline?: FrameSpace;
  className?: string;
  style?: CSSProperties;
}

const space = (v: FrameSpace) => (v === 'none' ? '0' : `var(--s-${v})`);

export function Frame({
  children,
  padding = '7',
  paddingBlock,
  paddingInline,
  className,
  style,
}: FrameProps) {
  return (
    <div
      className={cx(styles.frame, className)}
      style={{
        paddingBlock: space(paddingBlock ?? padding),
        paddingInline: space(paddingInline ?? padding),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
