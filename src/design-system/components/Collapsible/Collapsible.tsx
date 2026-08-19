import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import styles from './Collapsible.module.scss';
import { cx } from '../../util/cx';

/* One section that shows and hides, with the trigger left to the caller —
   a heading row, a "Show more" link, whatever the surface needs. The panel
   animates its own height and the trigger carries the aria wiring, which a
   conditionally rendered <div> does not.

   Accordion is this same primitive with a title row and chevron already
   built; reach for it whenever that is the shape you want. */

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
