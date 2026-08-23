import { type ReactNode, type CSSProperties, type Ref, useCallback, useState } from 'react';
import styles from './VizContainer.module.scss';
import { cx } from '../../util/cx';
import { Frame } from '../Frame';
import { Loader } from '../Loader';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { Skeleton } from '../Skeleton';
import { XCircle, ArrowCounterClockwise, DownloadSimple } from '@phosphor-icons/react';

export interface VizDimensions {
  width: number;
  height: number;
}

export interface VizContainerProps {
  title?: string;
  toolbar?: ReactNode;
  legend?: ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onExport?: () => void;
  aspectRatio?: number;
  canvasRef?: Ref<HTMLDivElement>;
  children?: ReactNode | ((dims: VizDimensions) => ReactNode);
  className?: string;
  style?: CSSProperties;
}

// `never[]` for the args makes any concrete signature contravariantly
// assignable; the runtime spread is parameterless from the caller.
function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let id: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function VizContainer({
  title,
  toolbar,
  legend,
  loading,
  error,
  onRetry,
  onExport,
  aspectRatio,
  canvasRef: externalRef,
  children,
  className,
  style,
}: VizContainerProps) {
  const [dims, setDims] = useState<VizDimensions>({ width: 0, height: 0 });

  // React 19 callback ref: observe resize on mount, return the
  // disconnect cleanup. Wrapped in useCallback so identity is stable
  // across re-renders; otherwise React tears down + reattaches the
  // ResizeObserver on every parent render.
  const canvasCallbackRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (typeof externalRef === 'function') {
        externalRef(el);
      } else if (externalRef) {
        // eslint-disable-next-line react-hooks/immutability
        (externalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }

      if (!el) return undefined;
      const update = debounce((entries: ResizeObserverEntry[]) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setDims({ width: Math.floor(width), height: Math.floor(height) });
        }
      }, 50);
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    },
    [externalRef],
  );

  const ready = !loading && !error;

  return (
    <Frame padding={0} className={cx(styles.root, className)} style={style}>
      {(title || toolbar || onExport) && (
        <div className={styles.titleBar}>
          {title && <span className={styles.title}>{title}</span>}
          <span style={{ flex: 1 }} />
          {toolbar}
          {ready && onExport && (
            <button
              type="button"
              className={styles.exportBtn}
              onClick={onExport}
              aria-label="Export"
            >
              <DownloadSimple size={13} />
            </button>
          )}
        </div>
      )}

      {legend && <div className={styles.legend}>{legend}</div>}

      <div
        ref={canvasCallbackRef}
        className={styles.canvas}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {loading ? (
          <div className={styles.loadingOverlay}>
            <Skeleton variant="rectangular" height="100%" />
            <div className={styles.loaderCenter}>
              <Loader size={24} />
            </div>
          </div>
        ) : error ? (
          <div className={styles.errorWrap}>
            <Alert
              color="red"
              icon={<XCircle size={14} weight="bold" />}
              actions={
                onRetry ? (
                  <Button variant="link" size="sm" onClick={onRetry}>
                    <ArrowCounterClockwise size={12} /> Retry
                  </Button>
                ) : undefined
              }
            >
              <strong>Render failed.</strong> {error}
            </Alert>
          </div>
        ) : typeof children === 'function' ? (
          dims.width > 0 ? (
            children(dims)
          ) : null
        ) : (
          children
        )}
      </div>
    </Frame>
  );
}
