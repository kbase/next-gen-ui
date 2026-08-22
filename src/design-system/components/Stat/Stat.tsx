import type { ReactNode } from 'react';
import styles from './Stat.module.scss';
import { cx } from '../../util/cx';
import { Frame } from '../Frame';
import type { FrameAccent } from '../Frame';

export interface StatProps {
  /** Already formatted. Only the caller knows the units. */
  value: ReactNode;
  label: string;
  /** For the no-data case, where the value is a dash rather than a number. */
  muted?: boolean;
  /** Tints the value. Reinforcement only: the number must read without it. */
  color?: FrameAccent;
  className?: string;
}

export function Stat({ value, label, muted, color, className }: StatProps) {
  return (
    <Frame padding={4} className={cx(styles.stat, className)}>
      <div className={cx(styles.value, muted && styles.muted, color && styles[color])}>{value}</div>
      <div className={styles.label}>{label}</div>
    </Frame>
  );
}
