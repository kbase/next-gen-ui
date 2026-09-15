import { useEffect, useRef } from 'react';
import type { Ref } from 'react';
import { createPortal } from 'react-dom';
import { useHost } from '../hooks/useHost';

export interface AppFrameProps {
  src: string;
  title: string;
  // The <iframe> itself: post to `contentWindow`, and compare a message's
  // `source` against it.
  ref?: Ref<HTMLIFrameElement>;
}

// An app in an iframe that survives its panel being moved. The frame is
// rendered into the workbench's frame layer and laid over the box this leaves
// in the panel; see frames.ts for why. The frame fills the box it is given,
// so size the element around this one.
export function AppFrame({ src, title, ref }: AppFrameProps) {
  const { frames } = useHost();
  const placeholder = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!placeholder.current || !frame.current) return;
    return frames.attach(frame.current, placeholder.current);
  }, [frames]);

  return (
    <>
      <div ref={placeholder} style={{ width: '100%', height: '100%' }} />
      {createPortal(
        <iframe
          ref={(el) => {
            frame.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }}
          src={src}
          title={title}
        />,
        frames.container,
      )}
    </>
  );
}
