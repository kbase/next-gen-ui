import { forwardRef } from 'react';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import styles from './Toolbar.module.scss';
import { Button as KBaseButton } from '../Button';
import { cx } from '../../util/cx';
import type { Size } from '../../util/size';

/* One tab stop; arrow keys move between the controls. Toolbar.Button renders
   a ghost Button unless render says otherwise:

     <Toolbar.Button render={<Button variant="danger" size="sm" />} />

   Separator takes the axis opposite the toolbar's. */

export interface RootProps extends Omit<BaseToolbar.Root.Props, 'className'> {
  /** Density tier; unset, the enclosing `data-density` applies. */
  size?: Size;
  className?: string;
}

export function Root({ size, className, ...props }: RootProps) {
  return <BaseToolbar.Root className={cx(styles.root, className)} data-size={size} {...props} />;
}

export interface GroupProps extends Omit<BaseToolbar.Group.Props, 'className'> {
  className?: string;
}

export function Group({ className, ...props }: GroupProps) {
  return <BaseToolbar.Group className={cx(styles.group, className)} {...props} />;
}

export interface SeparatorProps extends Omit<BaseToolbar.Separator.Props, 'className'> {
  className?: string;
}

export function Separator({ className, ...props }: SeparatorProps) {
  return <BaseToolbar.Separator className={cx(styles.separator, className)} {...props} />;
}

export const Button = forwardRef<HTMLButtonElement, BaseToolbar.Button.Props>(function Button(
  { render = <KBaseButton variant="ghost" size="sm" />, ...props },
  ref,
) {
  return <BaseToolbar.Button ref={ref} render={render} {...props} />;
});
