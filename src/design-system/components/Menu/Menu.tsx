import { forwardRef } from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import styles from './Menu.module.scss';
import { Check } from '@phosphor-icons/react';
import { Button } from '../Button';
import { cx } from '../../util/cx';

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
  className?: string;
}

export function Popup({ className, ...props }: PopupProps) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={styles.positioner}>
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

export interface CheckboxItemProps extends Omit<BaseMenu.CheckboxItem.Props, 'className'> {
  className?: string;
}

// A toggling item. The check mark occupies its slot even when unchecked so
// labels in one menu stay aligned.
export function CheckboxItem({ className, children, ...props }: CheckboxItemProps) {
  return (
    <BaseMenu.CheckboxItem className={cx(styles.item, className)} {...props}>
      <BaseMenu.CheckboxItemIndicator className={styles.indicator} keepMounted>
        <Check size={14} weight="bold" aria-hidden="true" />
      </BaseMenu.CheckboxItemIndicator>
      {children}
    </BaseMenu.CheckboxItem>
  );
}
