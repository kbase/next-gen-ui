import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import styles from './Tabs.module.scss';
import { cx } from '../../util/cx';
import type { Size } from '../../util/size';

export interface TabsRootProps extends BaseTabs.Root.Props {
  /** Density tier; unset, the enclosing `data-density` applies. */
  size?: Size;
  className?: string;
}

export function Root({ size, className, ...props }: TabsRootProps) {
  return <BaseTabs.Root className={className} data-size={size} {...props} />;
}

export interface TabsListProps extends Omit<BaseTabs.List.Props, 'className'> {
  className?: string;
}

export function List({ className, ...props }: TabsListProps) {
  return <BaseTabs.List className={cx(styles.list, className)} {...props} />;
}

export interface TabProps extends Omit<BaseTabs.Tab.Props, 'className'> {
  className?: string;
}

export function Tab({ className, ...props }: TabProps) {
  return <BaseTabs.Tab className={cx(styles.tab, className)} {...props} />;
}

export interface PanelProps extends Omit<BaseTabs.Panel.Props, 'className'> {
  className?: string;
}

export function Panel({ className, ...props }: PanelProps) {
  return <BaseTabs.Panel className={cx(styles.panel, className)} {...props} />;
}
