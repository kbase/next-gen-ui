import type { ReactNode } from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import { CaretDown, CheckCircle, Info, Warning, XCircle } from '@phosphor-icons/react';
import { Button } from '../Button';
import styles from './Alert.module.scss';
import { cx } from '../../util/cx';

export type AlertColor = 'green' | 'primary' | 'yellow' | 'red';

/* Severity is never colour alone, so each colour carries a shape by default.
   Pass `icon` for one that says more about the particular alert. */
const DEFAULT_ICON: Record<AlertColor, ReactNode> = {
  green: <CheckCircle size={16} weight="bold" />,
  primary: <Info size={16} weight="bold" />,
  yellow: <Warning size={16} weight="bold" />,
  red: <XCircle size={16} weight="bold" />,
};

export interface AlertProps {
  color: AlertColor;
  /** Defaults to the colour's own shape. Pass `null` only if a sibling element
   * already states the severity in something other than colour. */
  icon?: ReactNode;
  children: ReactNode;
  /** Collapsible detail (stack trace, long message) */
  trace?: string;
  /** Action row below message (retry, support link, dismiss) */
  actions?: ReactNode;
  /** Override the default ARIA role (red → alert, others → status). */
  role?: 'alert' | 'status';
  className?: string;
}

export function Alert({ color, icon, children, trace, actions, role, className }: AlertProps) {
  const ariaRole = role ?? (color === 'red' ? 'alert' : 'status');
  const glyph = icon === undefined ? DEFAULT_ICON[color] : icon;
  return (
    <Collapsible.Root role={ariaRole} className={cx(styles.alert, styles[color], className)}>
      <div className={styles.alertHeader}>
        {glyph && (
          <span className={styles.icon} aria-hidden="true">
            {glyph}
          </span>
        )}
        <div className={styles.body}>
          <div>{children}</div>
          {(trace || actions) && (
            <div className={styles.actions}>
              {actions}
              {trace && (
                <Collapsible.Trigger
                  render={<Button variant="link" size="sm" />}
                  className={styles.disclose}
                >
                  Details
                  <CaretDown size={12} weight="bold" className={styles.chevron} />
                </Collapsible.Trigger>
              )}
            </div>
          )}
        </div>
      </div>
      {trace && (
        <Collapsible.Panel className={styles.tracePanel}>
          <pre className={styles.tracePre}>{trace}</pre>
        </Collapsible.Panel>
      )}
    </Collapsible.Root>
  );
}
