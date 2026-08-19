import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import styles from './Collapsible.module.scss';
import { cx } from '../../util/cx';

/* A section whose trigger is a control rather than a title — "Show code",
   "More details". The trigger is styled text and emits no heading, so it suits
   detail only some readers need. Keep the panel immediately after the trigger
   so a screen reader reaches it by moving forward. Use Accordion where the
   trigger titles the section. */

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
