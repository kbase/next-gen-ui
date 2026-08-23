import type { ReactNode } from 'react';
import styles from './NotificationFeed.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';
import { Frame } from '../Frame';
import { Row } from '../Row';
import { Info, CheckCircle, Warning, XCircle, Briefcase, X } from '@phosphor-icons/react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'job';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: string;
  read: boolean;
  action?: { label: string; onClick: () => void };
}

export interface NotificationFeedProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onClearAll?: () => void;
  className?: string;
}

/* --ct-*, not the static --c-* fills: as a thin glyph, --c-yellow is 1.45:1. */
const TYPE_ICON: Record<NotificationType, ReactNode> = {
  info: <Info size={14} weight="bold" style={{ color: 'var(--ct-primary)' }} />,
  success: <CheckCircle size={14} weight="bold" style={{ color: 'var(--ct-green)' }} />,
  warning: <Warning size={14} weight="bold" style={{ color: 'var(--ct-yellow)' }} />,
  error: <XCircle size={14} weight="bold" style={{ color: 'var(--ct-red)' }} />,
  job: <Briefcase size={14} weight="bold" style={{ color: 'var(--ct-primary)' }} />,
};

function groupByTimestamp(items: NotificationItem[]) {
  const groups: { label: string; items: NotificationItem[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  for (const item of items) {
    if (!current || current.label !== item.timestamp) {
      current = { label: item.timestamp, items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}

export function NotificationFeed({
  notifications,
  onDismiss,
  onMarkRead,
  onClearAll,
  className,
}: NotificationFeedProps) {
  const groups = groupByTimestamp(notifications);

  return (
    <Frame padding={0} className={cx(styles.root, className)}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Notifications</span>
        {onClearAll && notifications.length > 0 && (
          <Button variant="link" size="sm" onClick={onClearAll}>
            Clear all
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>No notifications</div>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <div className={styles.groupLabel}>{group.label}</div>
            {group.items.map((item) => (
              <div key={item.id} className={cx(styles.itemWrap, !item.read && styles.unread)}>
                <Row
                  title={item.title}
                  meta={
                    <>
                      {item.message}
                      {item.action && (
                        <button
                          type="button"
                          className={styles.actionLink}
                          onClick={() => {
                            onMarkRead?.(item.id);
                            item.action!.onClick();
                          }}
                        >
                          {item.action.label}
                        </button>
                      )}
                    </>
                  }
                  onClick={item.action || !onMarkRead ? undefined : () => onMarkRead(item.id)}
                >
                  {TYPE_ICON[item.type]}
                </Row>
                <button
                  type="button"
                  className={styles.dismiss}
                  onClick={() => onDismiss(item.id)}
                  aria-label="Dismiss"
                >
                  <X size={9} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </Frame>
  );
}
