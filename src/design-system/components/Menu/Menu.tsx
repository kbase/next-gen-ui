import { Menu as BaseMenu } from '@base-ui/react/menu';
import styles from './Menu.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';

export function Root(props: BaseMenu.Root.Props) {
  return <BaseMenu.Root {...props} />;
}

export function Trigger({ render = <Button />, ...props }: BaseMenu.Trigger.Props) {
  return <BaseMenu.Trigger render={render} {...props} />;
}

export interface PopupProps extends Omit<BaseMenu.Popup.Props, 'className'> {
  className?: string;
}

export function Popup({ className, ...props }: PopupProps) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner>
        <BaseMenu.Popup className={cx(styles.popup, className)} {...props} />
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
