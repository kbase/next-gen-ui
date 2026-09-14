import { useId, type ReactNode } from 'react';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { CaretDown } from '@phosphor-icons/react';
import styles from './Accordion.module.scss';
import { cx } from '../../util/cx';

/* Sections whose triggers are their titles; each renders as a heading. Root's
   value lists the open items. Sections open independently — pass
   multiple={false} for one at a time. Use Collapsible when the trigger is a
   control, not a title.

   An Item with a title is the whole of a section: the title, an icon before
   it, a summary beside it, the children in the panel. A consumer whose
   trigger has to carry more than that — an id something else names, a drag
   handle, a context menu around it — gives Item no title and composes the
   parts inside it: Header, Trigger and Panel, with Chevron where the caret
   goes. */

export interface RootProps extends Omit<BaseAccordion.Root.Props, 'className'> {
  className?: string;
}

export function Root({ multiple = true, className, ...props }: RootProps) {
  return (
    <BaseAccordion.Root multiple={multiple} className={cx(styles.root, className)} {...props} />
  );
}

export interface HeaderProps extends Omit<BaseAccordion.Header.Props, 'className'> {
  className?: string;
}

export function Header({ className, ...props }: HeaderProps) {
  return <BaseAccordion.Header className={cx(styles.header, className)} {...props} />;
}

export interface TriggerProps extends Omit<BaseAccordion.Trigger.Props, 'className'> {
  className?: string;
}

export function Trigger({ className, ...props }: TriggerProps) {
  return <BaseAccordion.Trigger className={cx(styles.trigger, className)} {...props} />;
}

/* The caret: turns with the trigger's open state. */
export function Chevron({ className }: { className?: string }) {
  return <CaretDown size={12} className={cx(styles.chevron, className)} aria-hidden="true" />;
}

export interface PanelProps extends Omit<BaseAccordion.Panel.Props, 'className'> {
  className?: string;
}

/* The measured, animated box; what goes inside it is the consumer's. An Item
   with a title pads its own. */
export function Panel({ className, ...props }: PanelProps) {
  return <BaseAccordion.Panel className={cx(styles.panel, className)} {...props} />;
}

export interface ItemProps extends Omit<BaseAccordion.Item.Props, 'className' | 'title'> {
  /** Without one, the item is the section's box alone and its children are
   *  the parts. */
  title?: ReactNode;
  /** Shown before the title. */
  icon?: ReactNode;
  /** Shown on the trigger in both states, for a count or a status. Exposed as
   *  the trigger's description, so the name stays the title. */
  summary?: ReactNode;
  className?: string;
}

export function Item({ title, icon, summary, className, children, ...props }: ItemProps) {
  const summaryId = useId();

  if (title === undefined) {
    return (
      <BaseAccordion.Item className={cx(styles.item, className)} {...props}>
        {children}
      </BaseAccordion.Item>
    );
  }

  return (
    <BaseAccordion.Item className={cx(styles.item, className)} {...props}>
      <Header>
        <Trigger aria-describedby={summary ? summaryId : undefined}>
          <span className={styles.titleRow}>
            {icon && (
              <span className={styles.icon} aria-hidden="true">
                {icon}
              </span>
            )}
            <span>{title}</span>
          </span>
          {summary && (
            <span id={summaryId} aria-hidden="true" className={styles.summary}>
              {summary}
            </span>
          )}
          <Chevron />
        </Trigger>
      </Header>
      <Panel>
        <div className={styles.panelInner}>{children}</div>
      </Panel>
    </BaseAccordion.Item>
  );
}
