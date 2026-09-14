import { forwardRef } from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import styles from './Menu.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';
import type { Size } from '../../util/size';

export function Root(props: BaseMenu.Root.Props) {
  return <BaseMenu.Root {...props} />;
}

export const Trigger = forwardRef<HTMLButtonElement, BaseMenu.Trigger.Props>(function Trigger(
  { render = <Button />, ...props },
  ref,
) {
  return <BaseMenu.Trigger ref={ref} render={render} {...props} />;
});

export interface PopupProps extends Omit<BaseMenu.Popup.Props, 'className'> {
  /**
   * Density tier. The popup is portaled to <body>, so a `data-density` on the page region
   * around the trigger does not reach it; set it here.
   */
  size?: Size;
  className?: string;
}

export function Popup({ size, className, ...props }: PopupProps) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={styles.positioner}>
        <BaseMenu.Popup className={cx(styles.popup, className)} data-size={size} {...props} />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export interface ItemProps extends Omit<BaseMenu.Item.Props, 'className'> {
  className?: string;
}

export function Item({ className, ...props }: ItemProps) {
  return <BaseMenu.Item className={cx(styles.item, className)} {...props} />;
}

export function Separator() {
  return <div className={styles.separator} role="separator" />;
}
