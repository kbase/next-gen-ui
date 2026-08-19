import { Field as BaseField } from '@base-ui/react/field';
import styles from './Field.module.scss';
import { Input } from '../Input';
import { cx } from '../../util/cx';

export interface FieldRootProps extends Omit<BaseField.Root.Props, 'className'> {
  className?: string;
}

export function Root({ className, ...props }: FieldRootProps) {
  return <BaseField.Root className={cx(styles.root, className)} {...props} />;
}

export interface FieldLabelProps extends Omit<BaseField.Label.Props, 'className'> {
  className?: string;
}
export function Label({ className, ...props }: FieldLabelProps) {
  return <BaseField.Label className={cx(styles.label, className)} {...props} />;
}

export interface FieldDescriptionProps extends Omit<BaseField.Description.Props, 'className'> {
  className?: string;
}
export function Description({ className, ...props }: FieldDescriptionProps) {
  return <BaseField.Description className={cx(styles.description, className)} {...props} />;
}

export interface FieldErrorProps extends Omit<BaseField.Error.Props, 'className'> {
  className?: string;
}
function FieldError({ className, ...props }: FieldErrorProps) {
  return <BaseField.Error className={cx(styles.error, className)} {...props} />;
}
export { FieldError as Error };

/* The escape hatch for a control the system does not ship. Input, Textarea,
   Select and the rest already wire themselves to Field.Root, so use those
   directly; this renders an Input unless render says otherwise. */
export function Control({ render = <Input />, ...props }: BaseField.Control.Props) {
  return <BaseField.Control render={render} {...props} />;
}
