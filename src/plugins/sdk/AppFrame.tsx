import { useEffect, useRef } from 'react';
import { useFrameLayer } from './frames';
import { usePanel } from './panel';

export interface AppFrameProps {
  src: string;
  title: string;
}

// An app in an iframe that survives its panel being moved. Outside a host
// that provides a frame layer it degrades to a plain iframe.
export function AppFrame({ src, title }: AppFrameProps) {
  const layer = useFrameLayer();
  const panel = usePanel();
  const placeholder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!layer || !placeholder.current) return;
    return layer.attach({ id: panel.id, src, title }, placeholder.current);
  }, [layer, panel.id, src, title]);

  if (!layer) {
    return <iframe src={src} title={title} style={{ border: 0, width: '100%', height: '100%' }} />;
  }
  return (
    <div
      ref={placeholder}
      style={{ width: '100%', height: '100%' }}
      aria-label={title}
      role="group"
    />
  );
}
