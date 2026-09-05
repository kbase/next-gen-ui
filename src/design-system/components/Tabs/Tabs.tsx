import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import styles from './Tabs.module.scss';
import { cx } from '../../util/cx';

export interface TabsRootProps extends BaseTabs.Root.Props {
  className?: string;
}

export function Root({ className, ...props }: TabsRootProps) {
  return <BaseTabs.Root className={className} {...props} />;
}

export interface TabsListProps extends Omit<BaseTabs.List.Props, 'className'> {
  className?: string;
  /** Hairlines between neighbours, for dense strips of document tabs. */
  dividers?: boolean;
}

export function List({ className, dividers, ...props }: TabsListProps) {
  return (
    <BaseTabs.List className={cx(styles.list, dividers && styles.dividers, className)} {...props} />
  );
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
