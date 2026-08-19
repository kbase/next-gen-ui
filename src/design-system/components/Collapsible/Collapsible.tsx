import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import styles from './Collapsible.module.scss';
import { cx } from '../../util/cx';

/* One section that shows and hides, for detail only some readers want. The
   trigger reads as text rather than a control, so it stays quieter than the
   surrounding content — do not use it to hide something most readers need.
   Keep the panel immediately after the trigger so a screen reader reaches the
   revealed content by moving forward. Accordion is the set of two or more
   such sections. */

export interface RootProps extends Omit<BaseCollapsible.Root.Props, 'className'> {
  className?: string;
}

export function Root({ className, ...props }: RootProps) {
  return <BaseCollapsible.Root className={className} {...props} />;
}

export function Trigger({ render, ...props }: BaseCollapsible.Trigger.Props) {
  return (
    <BaseCollapsible.Trigger
      render={render ?? <button type="button" className={styles.trigger} />}
      {...props}
    />
  );
}

export interface PanelProps extends Omit<BaseCollapsible.Panel.Props, 'className'> {
  className?: string;
}

export function Panel({ className, ...props }: PanelProps) {
  return <BaseCollapsible.Panel className={cx(styles.panel, className)} {...props} />;
}
