import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { RefCallback } from 'react';
import type { Panel, PanelId } from '../core';

// Where each panel is drawn, and the geometry that puts it there. No React in
// here beyond the hook that registers a slot: this is a register of boxes.
//
// A panel body is drawn once, in one flat container (PanelLayer), and laid
// over the slot its place in the layout measures out. Moving a tab to another
// group, splitting a group and moving a pane between the sidebar and the main
// area all change which slot a body follows; none of them changes the body's
// parent, so React never unmounts it and the plugin's `mount` runs once per
// panel. A body holding an <iframe> is the case that forced this — a browser
// reloads an iframe whenever it is moved in the DOM — but nothing here is
// about iframes: whatever a panel holds survives a move.

export interface SlotSpec {
  panel: Panel;
  // The slot is not showing its panel: a background tab, a pinned pane whose
  // sidebar is collapsed. The body stays mounted, is not drawn, and is not
  // measured.
  hidden?: boolean;
  // Two slots can name one panel — a pinned pane's block and the flyout its
  // rail icon opens. The shown slot with the highest priority is where the
  // panel is drawn, which is what keeps one panel to one mount.
  priority?: number;
  // A pointer or a focus landing in the body makes this the focused panel.
  // Off for a flyout and a preview, which are not places in the layout.
  activates?: boolean;
  // The slot takes its height from the body rather than the other way round:
  // a pane declaring `fit: 'content'`.
  sizing?: 'content';
  // The body draws above anchored overlays, for a slot inside one.
  anchored?: boolean;
  // The card the slot sits in rounds and clips its bottom corners; the body
  // is no longer inside it to be clipped, so it carries the radius itself.
  shape?: 'group';
  role?: 'tabpanel';
  labelledBy?: string;
}

export interface Entry {
  panel: Panel;
  spec: SlotSpec;
  // The slot the body is drawn over; null while no slot is showing it.
  slot: HTMLElement | null;
}

export interface PanelLayerApi {
  // A slot, keyed by the hook instance that owns it rather than by panel, so
  // two slots can name one panel and the loser is still known.
  set: (key: number, el: HTMLElement, spec: SlotSpec) => void;
  clear: (key: number) => void;
  // The element a panel's body is drawn in, as the layer commits it.
  body: (panel: PanelId, el: HTMLElement | null) => void;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  entries: () => Entry[];
  // Starts following the slots. `onLayoutChange` is the workbench store's
  // subscribe: a move that changes no box's size still moves boxes.
  watch: (onLayoutChange: (listener: () => void) => () => void) => () => void;
}

export const PanelLayerContext = createContext<PanelLayerApi | null>(null);

let nextKey = 0;

// Registers the element it is given as the place `spec.panel` is drawn.
// Outside a `PanelLayer` it does nothing, so a piece of the shell can be
// rendered on its own and simply draw no panels.
//
// A ref callback rather than a ref object: a slot can appear without its
// owner re-rendering — the flyout's slot is inside a popover whose open state
// belongs to the popover, not to the component that declared the slot — and
// only the callback runs when that element attaches.
export function usePanelSlot<T extends HTMLElement>(spec: SlotSpec | null): RefCallback<T> {
  const layer = useContext(PanelLayerContext);
  const [key] = useState(() => nextKey++);
  const held = useRef<{ el: HTMLElement | null; spec: SlotSpec | null }>({ el: null, spec: null });

  const attach = useCallback(
    (el: T | null) => {
      held.current.el = el;
      if (!layer) return;
      const current = held.current.spec;
      if (el && current) layer.set(key, el, current);
      else layer.clear(key);
    },
    [layer, key],
  );

  // No dependency list: the spec is rebuilt on every render, and `set` keeps
  // only what changed.
  useLayoutEffect(() => {
    held.current.spec = spec;
    if (!layer) return;
    const el = held.current.el;
    if (el && spec) layer.set(key, el, spec);
    else layer.clear(key);
  });

  useLayoutEffect(() => () => layer?.clear(key), [layer, key]);

  return attach;
}

function sameSpec(a: SlotSpec, b: SlotSpec): boolean {
  return (
    a.panel.id === b.panel.id &&
    a.panel.plugin === b.panel.plugin &&
    a.panel.kind === b.panel.kind &&
    a.hidden === b.hidden &&
    a.priority === b.priority &&
    a.activates === b.activates &&
    a.sizing === b.sizing &&
    a.anchored === b.anchored &&
    a.shape === b.shape &&
    a.role === b.role &&
    a.labelledBy === b.labelledBy
  );
}

function sameEntries(a: Entry[], b: Entry[]): boolean {
  return a.length === b.length && a.every((e, i) => e.slot === b[i].slot && sameSpec(e.spec, b[i].spec));
}

// The ancestors that clip a slot's overflow. They clipped the body too while
// it was inside them; drawn outside, it has to be told, and their boxes are
// as much of its geometry as its own slot's — the sidebar's width animation
// changes none of the slots and all of the clips.
function clippers(slot: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (let el = slot.parentElement; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') found.push(el);
  }
  return found;
}

// The box a slot is drawn in, as a clip in the body's own coordinates. Null
// when the slot is clipped away entirely — a block scrolled out of the
// sidebar's viewport, or a sidebar cropped to its rail.
function clipOf(slot: HTMLElement, rect: DOMRect): string | null {
  let { top, right, bottom, left } = rect;
  for (const el of clippers(slot)) {
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    top = Math.max(top, box.top);
    left = Math.max(left, box.left);
    right = Math.min(right, box.right);
    bottom = Math.min(bottom, box.bottom);
  }
  if (right <= left || bottom <= top) return null;
  return `inset(${top - rect.top}px ${rect.right - right}px ${rect.bottom - bottom}px ${left - rect.left}px)`;
}

export function createPanelLayer(): PanelLayerApi {
  const slots = new Map<number, { el: HTMLElement; spec: SlotSpec }>();
  const bodies = new Map<PanelId, HTMLElement>();
  const listeners = new Set<() => void>();
  // Creation order, not layout order: a panel keeps the place in the document
  // it first took, so a move changes only where it is drawn.
  let order: PanelId[] = [];
  let entries: Entry[] = [];
  let version = 0;
  let pending = false;
  let watching: (() => void) | null = null;

  const measure = () => {
    for (const entry of entries) {
      const body = bodies.get(entry.panel.id);
      const slot = entry.slot;
      if (!body || !slot) continue;
      const rect = slot.getBoundingClientRect();
      // Nothing to read: a document with no layout engine, or a slot in a
      // subtree that has none. Leaving the last geometry beats collapsing the
      // body onto a point.
      if (rect.width === 0 && rect.height === 0) continue;
      body.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
      body.style.width = `${rect.width}px`;
      if (entry.spec.sizing === 'content') {
        // The body's height is its content's, and the slot is told to be that
        // tall. One direction only, so the two cannot chase each other. The
        // slot leaves the flex line it would otherwise share, or its
        // flex-basis would win over the height it is being given.
        body.style.height = 'auto';
        slot.style.flex = '0 0 auto';
        slot.style.height = `${body.offsetHeight}px`;
      } else {
        body.style.height = `${rect.height}px`;
      }
      body.style.clipPath = clipOf(slot, rect) ?? 'inset(100%)';
    }
  };

  const flush = () => {
    pending = false;
    const byPanel = new Map<PanelId, { el: HTMLElement; spec: SlotSpec }[]>();
    for (const slot of slots.values()) {
      const id = slot.spec.panel.id;
      const found = byPanel.get(id);
      if (found) found.push(slot);
      else byPanel.set(id, [slot]);
    }
    order = order.filter((id) => byPanel.has(id));
    for (const id of byPanel.keys()) if (!order.includes(id)) order.push(id);

    const rank = (slot: { spec: SlotSpec }) => (slot.spec.hidden ? -1 : (slot.spec.priority ?? 0));
    const next = order.map((id) => {
      const claiming = byPanel.get(id)!;
      const best = claiming.reduce((a, b) => (rank(b) > rank(a) ? b : a));
      return { panel: best.spec.panel, spec: best.spec, slot: best.spec.hidden ? null : best.el };
    });
    if (!sameEntries(next, entries)) {
      entries = next;
      version += 1;
      for (const listener of listeners) listener();
    }
    resettle();
  };

  // Deferred by a microtask so that a move — the old slot unregistering and
  // the new one registering inside one commit — is one flush, and the panel
  // never passes through a state with no slot at all.
  const mark = () => {
    if (pending) return;
    pending = true;
    queueMicrotask(flush);
  };

  // A burst rather than one measurement. A slot that has just appeared may be
  // placed again right after — by the popover positioner that holds it, or by
  // the sidebar's width transition — and being moved is not a size change, so
  // the observer says nothing about it.
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

  let observer: ResizeObserver | null = null;
  const rewatch = () => {
    if (!observer) return;
    observer.disconnect();
    observer.observe(document.documentElement);
    for (const entry of entries) {
      if (!entry.slot) continue;
      observer.observe(entry.slot);
      for (const el of clippers(entry.slot)) observer.observe(el);
      const body = bodies.get(entry.panel.id);
      if (body) observer.observe(body);
    }
  };

  return {
    set(key, el, spec) {
      const prev = slots.get(key);
      slots.set(key, { el, spec });
      if (!prev || prev.el !== el || !sameSpec(prev.spec, spec)) mark();
    },
    clear(key) {
      if (slots.delete(key)) mark();
    },
    body(panel, el) {
      if (el) bodies.set(panel, el);
      else bodies.delete(panel);
      resettle();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
    entries: () => entries,
    watch(onLayoutChange) {
      // A box moves because something resized (the window, a split, a folded
      // block, the sidebar's width transition), because something scrolled,
      // or because the layout changed and moved it without resizing anything.
      // The observer answers the first, the capture listener the second, and
      // the store the third.
      const onScroll = () => measure();
      const offLayout = onLayoutChange(resettle);
      observer = new ResizeObserver(measure);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      watching = () => {
        offLayout();
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
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
