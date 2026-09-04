import { type InputHTMLAttributes } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import styles from './SearchBar.module.scss';
import { cx } from '../../util/cx';
import type { Size } from '../../util/size';

export interface SearchBarProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'size'
> {
  value: string;
  onValueChange: (value: string) => void;
  /** Density tier; unset, the enclosing `data-density` applies. */
  size?: Size;
  className?: string;
}

export function SearchBar({
  value,
  onValueChange,
  size,
  className,
  // Paired with className on the root; in props it reaches the inner input.
  style,
  placeholder = 'Search...',
  ...props
}: SearchBarProps) {
  return (
    <div className={cx(styles.root, className)} data-size={size} style={style}>
      <MagnifyingGlass size={14} className={styles.icon} />
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        {...props}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onValueChange('')}
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
