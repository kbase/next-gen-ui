import type {
  ReactNode,
  CSSProperties,
  KeyboardEvent,
  TdHTMLAttributes,
  HTMLAttributes,
} from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
import styles from './Table.module.scss';
import { cx } from '../../util/cx';
import type { Size } from '../../util/size';

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  className?: string;
  /** Density tier; unset, the enclosing `data-density` applies. */
  size?: Size;
  /** No border, radius or background, and `size="sm"` unless `size` says otherwise. */
  compact?: boolean;
}
interface TheadProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
}
interface TbodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}
interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  className?: string;
}
interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface ThProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  sort?: 'asc' | 'desc';
  onClick?: () => void;
  colSpan?: number;
}

export function Table({ children, className, size, compact, ...props }: TableProps) {
  return (
    <div
      className={cx(styles.wrapper, compact && styles.compact)}
      data-size={size ?? (compact ? 'sm' : undefined)}
    >
      <table className={cx(styles.table, className)} {...props}>
        {children}
      </table>
    </div>
  );
}
export function Thead({ children, className, ...props }: TheadProps) {
  return (
    <thead className={cx(styles.thead, className)} {...props}>
      {children}
    </thead>
  );
}
export function Tbody({ children, ...props }: TbodyProps) {
  return <tbody {...props}>{children}</tbody>;
}
export function Tr({ children, className, ...props }: TrProps) {
  return (
    <tr className={cx(styles.tr, className)} {...props}>
      {children}
    </tr>
  );
}
export function Th({ children, className, style, sort, onClick, colSpan }: ThProps) {
  const sortable = onClick != null;
  const onKeyDown = sortable
    ? (e: KeyboardEvent<HTMLTableCellElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;
  return (
    <th
      className={cx(styles.th, sortable && styles.thSortable, className)}
      style={style}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={sortable ? 0 : undefined}
      colSpan={colSpan}
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
    >
      {children}
      {sortable && (
        <span className={cx(styles.sortIcon, sort && styles.sortActive)}>
          {sort === 'desc' ? (
            <CaretDown size={10} weight="bold" />
          ) : (
            <CaretUp size={10} weight="bold" />
          )}
        </span>
      )}
    </th>
  );
}
export function Td({ children, className, ...props }: TdProps) {
  return (
    <td className={cx(styles.td, className)} {...props}>
      {children}
    </td>
  );
}
