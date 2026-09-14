import { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createHtmlPortalNode } from 'react-reverse-portal';
import type { HtmlPortalNode } from 'react-reverse-portal';
import { useDispatch, useServices } from './context';
import type { Panel, PanelId } from '../core';

// Which slot draws each panel, and the node its contents live in.
//
// A panel's contents are rendered once, into a detached element of their own,
// and that element is attached inside whichever slot is drawing the panel.
// Moving a tab to another group, splitting a group and moving a pane between
// the sidebar and the main area all change which slot that is; none of them
// re-renders the contents, so the plugin's `mount` runs once per panel. The
// contents are inside the box a reader sees, so height, clipping, scrolling,
// the accessibility tree and tab order are the browser's again.
//
// Two slots can name one panel — a pinned pane's block and the flyout its
// rail icon opens — and a node can be attached in only one place, so this
// picks between them. That is the whole of what is central here.

interface SlotSpec {
  panel: Panel;
  // The slot is not showing its panel: a background tab, a pinned pane whose
  // sidebar is collapsed. It still holds the panel, so the contents stay
  // mounted, and it loses to any slot that is showing the same panel.
  hidden?: boolean;
  // Higher wins between two shown slots naming one panel.
  priority?: number;
}

export interface Entry {
  panel: Panel;
  node: HtmlPortalNode;
}

interface PanelLayerApi {
  // A claim, keyed by the hook instance that owns it rather than by panel, so
  // two slots can name one panel and the loser is still known.
  claim: (key: number, spec: SlotSpec) => void;
  release: (key: number) => void;
  draws: (key: number) => boolean;
  node: (panel: PanelId) => HtmlPortalNode;
  // Recomputes from the claims as they now stand, and is the only thing that
  // lets a panel go. Called from the layer's own layout effect: a claim
  // changing marks the layer, React re-renders the layer before it paints,
  // and the layer settles once with every claim in that commit registered.
  // A move releases one claim and makes another inside a single commit, and
  // settling between the two would see a panel with no slot at all.
  settle: () => void;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  entries: () => Entry[];
}

export const PanelLayerContext = createContext<PanelLayerApi | null>(null);

let nextKey = 0;

function sameSpec(a: SlotSpec, b: SlotSpec): boolean {
  return (
    a.panel.id === b.panel.id &&
    a.panel.plugin === b.panel.plugin &&
    a.panel.kind === b.panel.kind &&
    a.hidden === b.hidden &&
    a.priority === b.priority
  );
}

function sameEntries(a: Entry[], b: Entry[]): boolean {
  return a.length === b.length && a.every((e, i) => e.node === b[i].node);
}

export function createPanelLayer(): PanelLayerApi {
  const claims = new Map<number, SlotSpec>();
  const nodes = new Map<PanelId, HtmlPortalNode>();
  const listeners = new Set<() => void>();
  let entries: Entry[] = [];
  // Panel to the claim that draws it.
  let drawing = new Map<PanelId, number>();
  // Each panel keeps the place it first took among the layer's children,
  // whatever slot it moves to. A moved panel's claim is the newest, and
  // listing panels in claim order would reorder the keyed children; React
  // moves a reordered child, and in development StrictMode re-runs the
  // effects of a child it moved, which would run the plugin's `mount` again
  // on every split.
  let order: PanelId[] = [];
  let version = 0;

  const changed = () => {
    version += 1;
    for (const listener of listeners) listener();
  };

  const node = (panel: PanelId): HtmlPortalNode => {
    const have = nodes.get(panel);
    if (have) return have;
    // `display: contents` so the panel's own root is laid out by the slot it
    // is attached in, exactly as if it had been written there.
    const made = createHtmlPortalNode({ attributes: { style: 'display: contents' } });
    nodes.set(panel, made);
    return made;
  };

  const rank = (spec: SlotSpec) => (spec.hidden ? -1 : (spec.priority ?? 0));

  return {
    claim(key, spec) {
      const prev = claims.get(key);
      claims.set(key, spec);
      if (!prev || !sameSpec(prev, spec)) changed();
    },
    release(key) {
      if (claims.delete(key)) changed();
    },
    draws(key) {
      const spec = claims.get(key);
      return spec !== undefined && drawing.get(spec.panel.id) === key;
    },
    node,
    settle() {
      const nextDrawing = new Map<PanelId, number>();
      const held = new Map<PanelId, Panel>();
      for (const [key, spec] of claims) {
        const id = spec.panel.id;
        const winner = nextDrawing.get(id);
        if (winner === undefined || rank(spec) > rank(claims.get(winner)!)) {
          nextDrawing.set(id, key);
        }
        if (!held.has(id)) held.set(id, spec.panel);
      }
      order = order.filter((id) => held.has(id));
      for (const id of held.keys()) if (!order.includes(id)) order.push(id);
      const next: Entry[] = order.map((id) => ({
        // The panel object the entry already holds, so navigating inside a
        // panel does not rebuild the list.
        panel: entries.find((e) => e.panel.id === id)?.panel ?? held.get(id)!,
        node: node(id),
      }));
      for (const id of nodes.keys()) if (!held.has(id)) nodes.delete(id);

      const moved =
        nextDrawing.size !== drawing.size ||
        [...nextDrawing].some(([id, key]) => drawing.get(id) !== key);
      if (!moved && sameEntries(next, entries)) return;
      entries = next;
      drawing = nextDrawing;
      changed();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
    entries: () => entries,
  };
}

const noSubscribe = () => () => {};

// Registers this slot as a place `spec.panel` can be drawn, and returns the
// node to attach when it is the place the panel is drawn now. Outside a
// `PanelLayer` it returns null, so a piece of the shell can be rendered on
// its own and simply draw no panels.
export function usePanelSlot(spec: SlotSpec | null): HtmlPortalNode | null {
  const layer = useContext(PanelLayerContext);
  const [key] = useState(() => nextKey++);

  // No dependency list: the spec is rebuilt on every render, and the layer
  // keeps only what changed.
  useLayoutEffect(() => {
    if (!layer) return;
    if (spec) layer.claim(key, spec);
    else layer.release(key);
  });

  useLayoutEffect(() => () => layer?.release(key), [layer, key]);

  const draws = useSyncExternalStore(
    layer?.subscribe ?? noSubscribe,
    () => layer?.draws(key) ?? false,
    () => false,
  );

  return draws && spec && layer ? layer.node(spec.panel.id) : null;
}

// A pointer or a focus landing in a panel makes it the focused panel. Pointer
// as well as focus: most of a panel is plain text, and clicking it fires no
// focus event, so the workbench focus would stay where it last was. The store
// is read rather than subscribed to: this asks about the focus at the moment
// of the click, and nothing here draws it.
export function usePanelActivation(id: PanelId): () => void {
  const { store } = useServices();
  const dispatch = useDispatch();
  return () => {
    if (store.get().focus === id) return;
    dispatch({ type: 'focus', panel: id, by: 'user' });
  };
}
