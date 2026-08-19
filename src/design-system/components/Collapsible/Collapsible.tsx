import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import styles from './Collapsible.module.scss';
import { cx } from '../../util/cx';

/* A single show/hide section. The trigger is unstyled; the panel animates
   its height. Accordion is the same primitive with a title row and chevron. */

export interface RootProps extends Omit<BaseCollapsible.Root.Props, 'className'> {
  className?: string;
}

export function Root({ className, ...props }: RootProps) {
  return <BaseCollapsible.Root className={className} {...props} />;
}

export function Trigger(props: BaseCollapsible.Trigger.Props) {
  return <BaseCollapsible.Trigger {...props} />;
}

export interface PanelProps extends Omit<BaseCollapsible.Panel.Props, 'className'> {
  className?: string;
}

export function Panel({ className, ...props }: PanelProps) {
  return <BaseCollapsible.Panel className={cx(styles.panel, className)} {...props} />;
}
