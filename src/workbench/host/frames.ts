import type { FrameLayer } from '../../plugins/sdk';

// The frame layer's host side: one container at the end of the document, and
// the geometry that lays each frame over the placeholder its panel holds. The
// placeholder is inside the panel and moves with it; the frame is here and
// never moves, which is what keeps its document across a move. See the SDK's
// frames.ts for the contract a plugin sees.
//
// A frame follows its placeholder for the movements the layer hears about: a
// size change of the placeholder, of anything that clips it, or of the
// document (the observer); a scroll of something containing it (the capture
// listener, filtered to that); the window resizing; and a layout operation,
// which can move a box without resizing anything (the store's subscribe).

export interface FrameLayerStore extends FrameLayer {
  // Puts the container in the document, under `parent`, until the returned
  // function runs. The container exists before the document has it, so a
  // frame a plugin rendered first is already inside.
  adopt: (parent: HTMLElement, className: string) => () => void;
  // While a panel is being dragged the frames stop taking pointer events, so
  // the drop zones under them can.
  setDragging: (dragging: boolean) => void;
  // Starts following the placeholders. `onLayoutChange` is the workbench
  // store's subscribe.
  watch: (onLayoutChange: (listener: () => void) => () => void) => () => void;
}

interface Entry {
  frame: HTMLElement;
  placeholder: HTMLElement;
}

// The ancestors that clip a placeholder's overflow. They clip the placeholder;
// the frame drawn over it is outside them and has to be told, and their boxes
// are as much of its geometry as the placeholder's own — the sidebar's width
// animation changes none of the placeholders and all of the clips.
function clippers(placeholder: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (let el = placeholder.parentElement; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') found.push(el);
  }
  return found;
}

// The box the placeholder is visible in, as a clip in the frame's own
// coordinates, with each corner rounded as the container whose corner it is
// rounds it. Null when the placeholder is clipped away entirely — a block
// scrolled out of the sidebar, or a sidebar cropped to its rail.
function clipOf(placeholder: HTMLElement, rect: DOMRect): string | null {
  let { top, right, bottom, left } = rect;
  const radii = { tl: 0, tr: 0, br: 0, bl: 0 };
  for (const el of clippers(placeholder)) {
    const outer = el.getBoundingClientRect();
    if (outer.width === 0 && outer.height === 0) continue;
    // Overflow is clipped at the padding box, and a corner's radius there is
    // the border's radius less the border's width.
    const style = getComputedStyle(el);
    const px = (v: string) => parseFloat(v) || 0;
    const border = {
      top: px(style.borderTopWidth),
      right: px(style.borderRightWidth),
      bottom: px(style.borderBottomWidth),
      left: px(style.borderLeftWidth),
    };
    const box = {
      top: outer.top + border.top,
      right: outer.right - border.right,
      bottom: outer.bottom - border.bottom,
      left: outer.left + border.left,
    };
    top = Math.max(top, box.top);
    left = Math.max(left, box.left);
    right = Math.min(right, box.right);
    bottom = Math.min(bottom, box.bottom);
    // A corner is rounded by the container whose two edges meet at it, and
    // only where the clip reaches those edges.
    const at = (edge: number, own: number) => Math.abs(edge - own) < 0.5;
    const inner = (radius: string, a: number, b: number) => Math.max(0, px(radius) - Math.max(a, b));
    if (at(top, box.top) && at(left, box.left))
      radii.tl = Math.max(radii.tl, inner(style.borderTopLeftRadius, border.top, border.left));
    if (at(top, box.top) && at(right, box.right))
      radii.tr = Math.max(radii.tr, inner(style.borderTopRightRadius, border.top, border.right));
    if (at(bottom, box.bottom) && at(right, box.right))
      radii.br = Math.max(radii.br, inner(style.borderBottomRightRadius, border.bottom, border.right));
    if (at(bottom, box.bottom) && at(left, box.left))
      radii.bl = Math.max(radii.bl, inner(style.borderBottomLeftRadius, border.bottom, border.left));
  }
  if (right <= left || bottom <= top) return null;
  const inset = `${top - rect.top}px ${rect.right - right}px ${rect.bottom - bottom}px ${left - rect.left}px`;
  const round = `${radii.tl}px ${radii.tr}px ${radii.br}px ${radii.bl}px`;
  return `inset(${inset} round ${round})`;
}

// The stacking tier the frame has to clear: the highest z-index among the
// placeholder's positioned ancestors, which is the popover's positioner when
// the panel is drawn in a rail flyout and nothing otherwise.
function tierAbove(placeholder: HTMLElement): number | null {
  let highest: number | null = null;
  for (let el = placeholder.parentElement; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (style.position === 'static' || style.zIndex === 'auto') continue;
    const z = Number(style.zIndex);
    if (!Number.isNaN(z) && (highest === null || z > highest)) highest = z;
  }
  return highest;
}

export function createFrameLayer(): FrameLayerStore {
  let container: HTMLElement | null = null;
  const entries = new Set<Entry>();
  let watching: (() => void) | null = null;
  let observer: ResizeObserver | null = null;

  const measure = () => {
    for (const { frame, placeholder } of entries) {
      const rect = placeholder.getBoundingClientRect();
      // No box: the placeholder is in a hidden tab, or in a document with no
      // layout engine. The frame is hidden with it, and keeps its document.
      if (rect.width === 0 && rect.height === 0) {
        frame.style.visibility = 'hidden';
        continue;
      }
      frame.style.visibility = '';
      frame.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
      frame.style.width = `${rect.width}px`;
      frame.style.height = `${rect.height}px`;
      frame.style.clipPath = clipOf(placeholder, rect) ?? 'inset(100%)';
      const tier = tierAbove(placeholder);
      frame.style.zIndex = tier === null ? '' : String(tier + 1);
    }
  };

  const rewatch = () => {
    if (!observer) return;
    observer.disconnect();
    observer.observe(document.documentElement);
    for (const { placeholder } of entries) {
      observer.observe(placeholder);
      for (const el of clippers(placeholder)) observer.observe(el);
    }
  };

  // A burst rather than one measurement. A placeholder that has just moved
  // may be placed again right after — by the popover positioner that holds
  // it, or by the sidebar's width transition — and being moved is not a size
  // change, so the observer says nothing about it.
  let burst = 0;
  let framesLeft = 0;
  const resettle = () => {
    if (!watching) return;
    rewatch();
    measure();
    framesLeft = 3;
    if (burst) return;
    const tick = () => {
      measure();
      burst = (framesLeft -= 1) > 0 ? requestAnimationFrame(tick) : 0;
    };
    burst = requestAnimationFrame(tick);
  };

  const element = () => (container ??= document.createElement('div'));

  return {
    get container() {
      return element();
    },
    adopt(parent, className) {
      const el = element();
      el.className = className;
      parent.appendChild(el);
      return () => el.remove();
    },
    setDragging(dragging) {
      element().toggleAttribute('data-dragging', dragging);
    },
    attach(frame, placeholder) {
      const entry = { frame, placeholder };
      entries.add(entry);
      resettle();
      return () => {
        entries.delete(entry);
        resettle();
      };
    },
    watch(onLayoutChange) {
      // A scroll moves a placeholder only when what scrolled contains it.
      const onScroll = (event: Event) => {
        const target = event.target;
        const holds = (el: Node) => [...entries].some((e) => el.contains(e.placeholder));
        if (!(target instanceof Node) || target === document || holds(target)) measure();
      };
      const onResize = () => measure();
      const offLayout = onLayoutChange(resettle);
      observer = new ResizeObserver(measure);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
      watching = () => {
        offLayout();
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
        observer?.disconnect();
        observer = null;
        if (burst) cancelAnimationFrame(burst);
        burst = 0;
        watching = null;
      };
      resettle();
      return watching;
    },
  };
}
