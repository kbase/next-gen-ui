import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import styles from './Collapsible.module.scss';
import { Button as KBaseButton } from '../Button';
import { cx } from '../../util/cx';

/* A single show/hide section. The trigger renders a ghost Button unless
   render says otherwise; the panel animates its height. Keep the panel
   immediately after the trigger so a screen reader reaches the revealed
   content by moving forward. Accordion is the same primitive with a title
   row and chevron. */

export interface RootProps extends Omit<BaseCollapsible.Root.Props, 'className'> {
  className?: string;
}

export function Root({ className, ...props }: RootProps) {
  return <BaseCollapsible.Root className={className} {...props} />;
}

export function Trigger({
  render = <KBaseButton variant="ghost" size="xs" />,
  ...props
}: BaseCollapsible.Trigger.Props) {
  return <BaseCollapsible.Trigger render={render} {...props} />;
}

export interface PanelProps extends Omit<BaseCollapsible.Panel.Props, 'className'> {
  className?: string;
}

export function Panel({ className, ...props }: PanelProps) {
  return <BaseCollapsible.Panel className={cx(styles.panel, className)} {...props} />;
}
