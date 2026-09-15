import { useRef } from 'react';
import { DotsSixVertical } from '@phosphor-icons/react';
import type { Key, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import type { SplitDir } from '../core';
import { normalizeSizes } from '../core';
import styles from './SplitView.module.css';

export interface SplitViewProps {
  dir: SplitDir;
  sizes: number[];
  onSizes: (sizes: number[]) => void;
  children: ReactNode[];
  // Children that keep their natural size and take no share (folded blocks).
  fixed?: boolean[];
  // Stable identity per slot, parallel to `children`. A reorder (move
  // up/down, pin by drop, unpin from the middle) swaps entries in `children`
  // and `ids` together, so the same id still labels the same subtree and
  // React keeps its mounted state instead of remounting everything after the
  // change point. Required, not optional: an index fallback would leave the
  // remount-on-reorder defect in place, silently, wherever a caller forgot it.
  ids: Key[];
  label?: string;
  className?: string;
}

const MIN = 0.1;
const STEP = 0.05;

// Lays children out along one axis with a draggable, keyboard-operable
// separator between each pair. Sizes are fractions of the whole; a drag or
// arrow key trades space between the two neighbours of a separator.
export function SplitView({
  dir,
  sizes,
  onSizes,
  children,
  fixed = [],
  ids,
  label,
  className,
}: SplitViewProps) {
  const container = useRef<HTMLDivElement>(null);

  const trade = (index: number, delta: number) => {
    const next = [...sizes];
    const a = Math.max(MIN, Math.min(next[index] + next[index + 1] - MIN, next[index] + delta));
    next[index + 1] = next[index] + next[index + 1] - a;
    next[index] = a;
    onSizes(next);
  };

  const startDrag = (index: number) => (event: PointerEvent<HTMLDivElement>) => {
    const el = container.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = dir === 'row' ? rect.width : rect.height;
    const origin = dir === 'row' ? event.clientX : event.clientY;
    const startSizes = [...sizes];
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const onMove = (e: globalThis.PointerEvent) => {
      const pos = dir === 'row' ? e.clientX : e.clientY;
      const delta = (pos - origin) / total;
      const next = [...startSizes];
      const pair = startSizes[index] + startSizes[index + 1];
      const a = Math.max(MIN, Math.min(pair - MIN, startSizes[index] + delta));
      next[index] = a;
      next[index + 1] = pair - a;
      onSizes(next);
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  };

  const onKey = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    const grow = dir === 'row' ? 'ArrowRight' : 'ArrowDown';
    const shrink = dir === 'row' ? 'ArrowLeft' : 'ArrowUp';
    if (event.key === grow) trade(index, STEP);
    else if (event.key === shrink) trade(index, -STEP);
    else return;
    event.preventDefault();
  };

  const shares = normalizeSizes(sizes.map((s, i) => (fixed[i] ? 0 : s)));
  return (
    <div
      ref={container}
      className={`${styles.split} ${dir === 'row' ? styles.splitRow : styles.splitCol} ${className ?? ''}`}
    >
      {children.map((child, i) => (
        <div
          key={ids[i]}
          className={styles.splitChild}
          style={fixed[i] ? { flex: '0 0 auto' } : { flex: `${shares[i]} 1 0px` }}
        >
          {child}
          {i < children.length - 1 && (
            <div
              role="separator"
              tabIndex={0}
              aria-orientation={dir === 'row' ? 'vertical' : 'horizontal'}
              aria-valuenow={Math.round(sizes[i] * 100)}
              aria-valuemin={Math.round(MIN * 100)}
              aria-valuemax={Math.round((1 - MIN) * 100)}
              aria-label={label ? `Resize ${label}` : 'Resize'}
              className={styles.separator}
              onPointerDown={startDrag(i)}
              onKeyDown={onKey(i)}
            >
              {/* Nothing at rest — the seam is a hairline between two panels
                  and not a control sitting in the layout. What appears when
                  the pointer reaches it is a grip rather than a line, because
                  a line says where the boundary is and a grip says it moves. */}
              <span className={styles.grip} aria-hidden="true">
                <DotsSixVertical size={12} weight="bold" />
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
