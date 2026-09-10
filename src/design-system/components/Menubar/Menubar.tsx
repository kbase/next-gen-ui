import { forwardRef } from 'react';
import { Menubar as BaseMenubar } from '@base-ui/react/menubar';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import styles from './Menubar.module.scss';
import { cx } from '../../util/cx';

// A horizontal bar of menus. Wrap each menu in `Menu.Root`, use
// `Menubar.Trigger` for its button and the ordinary `Menu.Popup`/`Menu.Item`
// for its contents; arrow keys move between menus.

export interface RootProps extends Omit<BaseMenubar.Props, 'className'> {
  className?: string;
}

export function Root({ className, ...props }: RootProps) {
  return <BaseMenubar className={cx(styles.bar, className)} {...props} />;
}

export interface TriggerProps extends Omit<BaseMenu.Trigger.Props, 'className'> {
  className?: string;
}

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(function Trigger(
  { className, ...props },
  ref,
) {
  return <BaseMenu.Trigger ref={ref} className={cx(styles.trigger, className)} {...props} />;
});
