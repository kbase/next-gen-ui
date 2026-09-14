import { Input as BaseInput } from '@base-ui/react/input';
import styles from './Input.module.scss';
import { cx } from '../../util/cx';
import type { Size } from '../../util/size';

/* The native `size` attribute (a width in characters) is dropped in favour of the density
   tier; the field is 100% wide regardless. */
export interface InputProps extends Omit<BaseInput.Props, 'className' | 'size'> {
  variant?: 'standard' | 'pill';
  /** Density tier. A pill defaults to `sm`; otherwise the enclosing `data-density` applies. */
  size?: Size;
  className?: string;
}

export function Input({ variant = 'standard', size, className, ...props }: InputProps) {
  return (
    <BaseInput
      className={cx(styles.input, variant === 'pill' && styles.pill, className)}
      data-size={size ?? (variant === 'pill' ? 'sm' : undefined)}
      {...props}
    />
  );
}
