import { createContext, useContext } from 'react';

// Browsers reload an <iframe> whenever it is moved in the DOM, so an app
// panel that followed its tab across groups would restart. Instead the host
// keeps every app frame in one fixed layer and lays each over the panel
// that owns it; the panel renders only a placeholder and reports its box.

export interface FrameSpec {
  id: string;
  src: string;
  title: string;
}

export interface FrameLayer {
  // Attaches the frame to a placeholder. Returns a detach function; a frame
  // detached and re-attached within the same tick keeps its document.
  attach: (spec: FrameSpec, placeholder: HTMLElement) => () => void;
}

export const FrameLayerContext = createContext<FrameLayer | null>(null);

export function useFrameLayer(): FrameLayer | null {
  return useContext(FrameLayerContext);
}
