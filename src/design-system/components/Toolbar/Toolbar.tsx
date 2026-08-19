import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import styles from './Toolbar.module.scss';
import { cx } from '../../util/cx';

/* A strip of related controls that the arrow keys move between, so the strip
   is one tab stop rather than one per control. Toolbar.Button carries that
   behaviour and no appearance — give it the look it should have by rendering
   a Button through it:

     <Toolbar.Button render={<Button variant="ghost" size="sm" />} />

   Group the controls that belong together and put a Separator between the
   groups; the separator takes the axis opposite the toolbar's own. */

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
