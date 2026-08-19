import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import styles from './Toolbar.module.scss';
import { cx } from '../../util/cx';

/* One tab stop; arrow keys move between the controls. Toolbar.Button has no
   styles of its own — pass the appearance through render:

     <Toolbar.Button render={<Button variant="ghost" size="sm" />} />

   Separator takes the axis opposite the toolbar's. */

export interface RootProps extends Omit<BaseToolbar.Root.Props, 'className'> {
  className?: string;
}

export function Root({ className, ...props }: RootProps) {
  return <BaseToolbar.Root className={cx(styles.root, className)} {...props} />;
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

export function Button(props: BaseToolbar.Button.Props) {
  return <BaseToolbar.Button {...props} />;
}

export function Link(props: BaseToolbar.Link.Props) {
  return <BaseToolbar.Link {...props} />;
}
