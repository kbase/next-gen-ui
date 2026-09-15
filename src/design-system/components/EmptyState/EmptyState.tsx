import type { ReactNode } from 'react';
import type { Size } from '../../util/size';
import styles from './EmptyState.module.scss';
import { cx } from '../../util/cx';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /**
   * `sm` for a narrow column — a sidebar block, a pane — where the page's
   * proportions would be most of the space: one caption line, aligned left,
   * the icon not drawn, the description as wide as the column.
   */
  size?: Size;
  className?: string;
}

export function EmptyState({ icon, title, description, action, size, className }: EmptyStateProps) {
  return (
    <div className={cx(styles.root, className)} data-size={size}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.desc}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
