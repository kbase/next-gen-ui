import { Field as BaseField } from '@base-ui/react/field';
import styles from './Field.module.scss';
import inputStyles from '../Input/Input.module.scss';
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

export interface FieldControlProps extends Omit<BaseField.Control.Props, 'className'> {
  className?: string;
}

/* Carries Input's appearance. Input and Select are this same part with their
   own props, so reach for those first; use Control with render for an element
   they do not cover. */
export function Control({ className, ...props }: FieldControlProps) {
  return <BaseField.Control className={cx(inputStyles.input, className)} {...props} />;
}
