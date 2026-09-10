import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import menuStyles from '../Menu/Menu.module.scss';
import { cx } from '../../util/cx';

// A right-click (or Shift+F10 / context-menu key) menu. Items share the
// Menu component's styling so the two read as one thing.

export function Root(props: BaseContextMenu.Root.Props) {
  return <BaseContextMenu.Root {...props} />;
}

export function Trigger(props: BaseContextMenu.Trigger.Props) {
  return <BaseContextMenu.Trigger {...props} />;
}

export interface PopupProps extends Omit<BaseContextMenu.Popup.Props, 'className'> {
  className?: string;
}

export function Popup({ className, ...props }: PopupProps) {
  return (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className={menuStyles.positioner}>
        <BaseContextMenu.Popup className={cx(menuStyles.popup, className)} {...props} />
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
}

export interface ItemProps extends Omit<BaseContextMenu.Item.Props, 'className'> {
  className?: string;
}

export function Item({ className, ...props }: ItemProps) {
  return <BaseContextMenu.Item className={cx(menuStyles.item, className)} {...props} />;
}

export function Separator() {
  return <div className={menuStyles.separator} role="separator" />;
}
