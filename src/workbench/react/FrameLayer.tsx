import { useEffect, useLayoutEffect, useRef } from 'react';
import { useServices } from './context';
import { useDragging } from './useDnd';
import styles from './Workbench.module.css';

// Puts the frame layer's container in the document and starts it following
// the placeholders. The container is the store's, made before React and
// handed to plugins as `host.frames.container`; this only adopts it.
export function FrameLayer() {
  const { frames } = useServices();
  const holder = useRef<HTMLDivElement>(null);
  const dragging = useDragging();

  useLayoutEffect(() => {
    if (holder.current) return frames.adopt(holder.current, styles.frameLayer);
  }, [frames]);

  useEffect(() => frames.watch(), [frames]);

  useEffect(() => frames.setDragging(dragging !== null), [frames, dragging]);

  return <div ref={holder} style={{ display: 'contents' }} />;
}
