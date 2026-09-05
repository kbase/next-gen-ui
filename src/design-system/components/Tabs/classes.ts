import styles from './Tabs.module.scss';
import { cx } from '../../util/cx';

// For tab strips the Tabs component cannot host — closeable, draggable,
// multi-group window tabs like the workbench's — the same classes applied
// to custom markup. Mark the selected trigger with `data-selected`.
export const tabClasses = {
  list: styles.list,
  listDividers: cx(styles.list, styles.dividers),
  tab: styles.tab,
} as const;
