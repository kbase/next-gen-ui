import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FrameLayerContext } from '../../plugins/sdk';
import type { FrameLayer as FrameLayerApi, FrameSpec } from '../../plugins/sdk';
import { useDragging } from './useDnd';
import styles from './Workbench.module.css';

interface Entry {
  spec: FrameSpec;
  placeholder: HTMLElement | null;
}

// Hosts every app iframe in one fixed layer and lays each over its panel's
// placeholder. Frames are hidden, not unmounted, while their panel is a
// background tab, and are dropped only after a detach that no re-attach
// follows in the same tick (a moved panel re-attaches before then).
export function FrameLayerProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Map<string, Entry>>(() => new Map());
  const pendingRemoval = useRef(new Set<string>());

  const api = useMemo<FrameLayerApi>(
    () => ({
      attach(spec, placeholder) {
        pendingRemoval.current.delete(spec.id);
        setEntries((prev) => new Map(prev).set(spec.id, { spec, placeholder }));
        return () => {
          pendingRemoval.current.add(spec.id);
          queueMicrotask(() => {
            if (!pendingRemoval.current.has(spec.id)) return;
            pendingRemoval.current.delete(spec.id);
            setEntries((prev) => {
              const next = new Map(prev);
              next.delete(spec.id);
              return next;
            });
          });
        };
      },
    }),
    [],
  );

  return (
    <FrameLayerContext value={api}>
      {children}
      <div className={styles.frameLayer} data-dragging={useDragging() ? '' : undefined}>
        {[...entries.values()].map((entry) => (
          <Frame key={entry.spec.id} entry={entry} />
        ))}
      </div>
    </FrameLayerContext>
  );
}

function Frame({ entry }: { entry: Entry }) {
  const iframe = useRef<HTMLIFrameElement>(null);

  // Follow the placeholder's box. A frame loop rather than observers: the
  // box moves for many reasons (splits resized, sidebar folded, scroll) and
  // one measurement per frame is cheaper than tracking them all.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = iframe.current;
      const target = entry.placeholder;
      if (el && target) {
        const rect = target.getBoundingClientRect();
        const hidden = rect.width === 0 || rect.height === 0 || target.offsetParent === null;
        el.style.visibility = hidden ? 'hidden' : 'visible';
        el.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [entry.placeholder]);

  return (
    <iframe ref={iframe} className={styles.frame} src={entry.spec.src} title={entry.spec.title} />
  );
}
