import {
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { CaretRight, File } from '@phosphor-icons/react';
import styles from './Tree.module.scss';
import { cx } from '../../util/cx';

export interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Right-aligned suffix (size, count, status). Always visible. */
  suffix?: ReactNode;
  /** Action buttons shown on hover, right-aligned after suffix */
  actions?: ReactNode;
  children?: TreeNode[];
}

export interface TreeProps {
  items: TreeNode[];
  selected?: string;
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string, event: MouseEvent) => void;
  defaultExpanded?: string[];
  /** The expanded ids. Use when controlled. */
  expanded?: string[];
  /** Called with the ids after a toggle, controlled or not. */
  onExpandedChange?: (ids: string[]) => void;
  /** Names the tree; without one it is announced only as "tree". */
  'aria-label'?: string;
  className?: string;
}

// Pure recursive lookup. Lifted out of the component so the recursive
// reference doesn't read an in-progress useCallback binding.
function findNode(id: string, nodes: TreeNode[]): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(id, node.children);
      if (found) return found;
    }
  }
  return undefined;
}

export function Root({
  items,
  selected,
  onSelect,
  onContextMenu,
  defaultExpanded = [],
  expanded: expandedProp,
  onExpandedChange,
  'aria-label': ariaLabel,
  className,
}: TreeProps) {
  const [ownExpanded, setOwnExpanded] = useState<Set<string>>(new Set(defaultExpanded));
  const listRef = useRef<HTMLUListElement>(null);

  const controlled = expandedProp !== undefined;
  const expanded = useMemo(
    () => (controlled ? new Set(expandedProp) : ownExpanded),
    [controlled, expandedProp, ownExpanded],
  );

  // Uncontrolled toggling reads this, so two toggles in one event compose.
  // toggle is its only writer and updates it together with ownExpanded.
  const latestOwn = useRef(ownExpanded);

  const toggle = useCallback(
    (id: string) => {
      // Controlled toggling reads the prop instead. A parent that ignores the
      // callback does not re-render, so a ref would hold an expansion that was
      // never displayed.
      const next = new Set(controlled ? expandedProp : latestOwn.current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (!controlled) {
        latestOwn.current = next;
        setOwnExpanded(next);
      }
      onExpandedChange?.([...next]);
    },
    [controlled, expandedProp, onExpandedChange],
  );

  const getAllVisibleIds = useCallback((): string[] => {
    const ids: string[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        ids.push(node.id);
        if (node.children?.length && expanded.has(node.id)) {
          walk(node.children);
        }
      }
    };
    walk(items);
    return ids;
  }, [items, expanded]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selected) return;
      const visibleIds = getAllVisibleIds();
      const idx = visibleIds.indexOf(selected);
      if (idx === -1) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          if (idx < visibleIds.length - 1) onSelect?.(visibleIds[idx + 1]);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (idx > 0) onSelect?.(visibleIds[idx - 1]);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const node = findNode(selected, items);
          if (node?.children?.length) {
            if (!expanded.has(selected)) {
              toggle(selected);
            } else {
              onSelect?.(node.children[0].id);
            }
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (expanded.has(selected)) {
            toggle(selected);
          }
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          onSelect?.(selected);
          break;
        }
      }
    },
    [selected, getAllVisibleIds, items, expanded, toggle, onSelect],
  );

  return (
    <ul
      ref={listRef}
      role="tree"
      aria-label={ariaLabel}
      className={cx(styles.root, className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {items.map((node) => (
        <Item
          key={node.id}
          node={node}
          depth={0}
          selected={selected}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={toggle}
          onContextMenu={onContextMenu}
        />
      ))}
    </ul>
  );
}

interface ItemProps {
  node: TreeNode;
  depth: number;
  selected?: string;
  expanded: Set<string>;
  onSelect?: (id: string) => void;
  onToggle: (id: string) => void;
  onContextMenu?: (id: string, event: MouseEvent) => void;
}

function Item({ node, depth, selected, expanded, onSelect, onToggle, onContextMenu }: ItemProps) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;

  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
    >
      <div
        className={cx(styles.item, isSelected && styles.selected)}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => {
          onSelect?.(node.id);
          if (hasChildren) onToggle(node.id);
        }}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault();
            onSelect?.(node.id);
            onContextMenu(node.id, e);
          }
        }}
      >
        <span className={cx(styles.chevron, isExpanded && styles.expanded)}>
          {hasChildren && <CaretRight size={10} weight="bold" />}
        </span>
        <span className={styles.icon}>{node.icon || (!hasChildren && <File size={13} />)}</span>
        <span className={styles.label}>{node.label}</span>
        {node.suffix && <span className={styles.suffix}>{node.suffix}</span>}
        {node.actions && <span className={styles.actions}>{node.actions}</span>}
      </div>
      {hasChildren && isExpanded && (
        <ul role="group" className={styles.children}>
          {node.children!.map((child) => (
            <Item
              key={child.id}
              node={child}
              depth={depth + 1}
              selected={selected}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
