import type { ReactNode } from 'react';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { CaretDown } from '@phosphor-icons/react';
import styles from './Accordion.module.scss';
import { cx } from '../../util/cx';

/* A set of sections. Arrow keys move between the triggers. Root's value lists
   the open items; an Item without a value gets a generated one. Sections open
   independently — pass multiple={false} for one at a time. Use Collapsible for
   a single section. */

export interface RootProps extends Omit<BaseAccordion.Root.Props, 'className'> {
  className?: string;
}

export function Root({ multiple = true, className, ...props }: RootProps) {
  return (
    <BaseAccordion.Root multiple={multiple} className={cx(styles.root, className)} {...props} />
  );
}

export interface ItemProps extends Omit<BaseAccordion.Item.Props, 'className' | 'title'> {
  title: ReactNode;
  /** Shown before the title. */
  icon?: ReactNode;
  /** Shown on the trigger in both states, for a count or a status. */
  summary?: ReactNode;
  className?: string;
}

export function Item({ title, icon, summary, className, children, ...props }: ItemProps) {
  return (
    <BaseAccordion.Item className={cx(styles.item, className)} {...props}>
      <BaseAccordion.Header className={styles.header}>
        <BaseAccordion.Trigger className={styles.trigger}>
          <span className={styles.titleRow}>
            {icon && (
              <span className={styles.icon} aria-hidden="true">
                {icon}
              </span>
            )}
            <span>{title}</span>
          </span>
          {summary && <span className={styles.summary}>{summary}</span>}
          <CaretDown size={12} className={styles.chevron} />
        </BaseAccordion.Trigger>
      </BaseAccordion.Header>
      <BaseAccordion.Panel className={styles.panel}>
        <div className={styles.panelInner}>{children}</div>
      </BaseAccordion.Panel>
    </BaseAccordion.Item>
  );
}
