import type { ReactNode } from 'react';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import styles from './SegmentedControl.module.scss';
import { cx } from '../../util/cx';

export interface SegmentOption {
  value: string;
  label: string;
  /** Shown instead of the label; the label then names the segment for screen readers. */
  icon?: ReactNode;
  /** A longer explanation of the option, shown as a tooltip on hover. */
  description?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  /** Names the group. Required unless a visible label points at it. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

/**
 * One choice from a short, always-visible set. A radio group, not a toolbar:
 * one tab stop, and the arrow keys move between segments.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentedControlProps) {
  return (
    <RadioGroup
      className={cx(styles.root, className)}
      value={value}
      onValueChange={(next: string) => onChange(next)}
      {...props}
    >
      {options.map((opt) => (
        <Radio.Root
          key={opt.value}
          value={opt.value}
          className={styles.btn}
          disabled={opt.disabled}
          title={opt.description}
          aria-label={opt.icon ? opt.label : undefined}
        >
          {opt.icon ?? opt.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
