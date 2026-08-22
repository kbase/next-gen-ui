import { type InputHTMLAttributes } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import styles from './SearchBar.module.scss';
import { cx } from '../../util/cx';

export interface SearchBarProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function SearchBar({
  value,
  onValueChange,
  className,
  // Paired with className on the root; in props it reaches the inner input.
  style,
  placeholder = 'Search...',
  ...props
}: SearchBarProps) {
  return (
    <div className={cx(styles.root, className)} style={style}>
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
