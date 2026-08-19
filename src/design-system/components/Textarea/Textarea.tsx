import { Input as BaseInput } from '@base-ui/react/input';
import styles from './Textarea.module.scss';
import { cx } from '../../util/cx';

export interface TextareaProps extends Omit<BaseInput.Props, 'className' | 'render'> {
  rows?: number;
  className?: string;
}

/* Base UI's Input part rendered as a textarea, so Field.Root supplies the id,
   label and description wiring. */
export function Textarea({ rows, className, ...props }: TextareaProps) {
  return (
    <BaseInput
      render={<textarea rows={rows} />}
      className={cx(styles.textarea, className)}
      {...props}
    />
  );
}
