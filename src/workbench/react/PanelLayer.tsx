import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useDispatch, useServices } from './context';
import { panelDomId } from './domIds';
import { PanelHost } from './PanelHost';
import { createPanelLayer, PanelLayerContext } from './panelSlots';
import type { Entry, PanelLayerApi } from './panelSlots';
import { useDragging } from './useDnd';
import styles from './Workbench.module.css';

// The one container every panel body is drawn in, each laid over the slot its
// place in the layout measures out for it. The bodies sit in the order their
// panels were created and never move; what a move changes is the box a body
// follows. See panelSlots.ts for the register behind it.
export function PanelLayer({ children }: { children: ReactNode }) {
  const layer = useMemo(() => createPanelLayer(), []);
  useSyncExternalStore(layer.subscribe, layer.version, layer.version);
  const { store } = useServices();
  const dragging = useDragging();

  useEffect(() => layer.watch(store.subscribe), [layer, store]);

  return (
    <PanelLayerContext value={layer}>
      {children}
      <div className={styles.panelLayer} data-dragging={dragging ? '' : undefined}>
        {layer.entries().map((entry) => (
          <Body key={entry.panel.id} entry={entry} layer={layer} />
        ))}
      </div>
    </PanelLayerContext>
  );
}

function Body({ entry, layer }: { entry: Entry; layer: PanelLayerApi }) {
  const { store } = useServices();
  const dispatch = useDispatch();
  const id = entry.panel.id;
  const hidden = entry.slot === null;

  // Pointer as well as focus: most of a panel is plain text, and clicking it
  // fires no focus event, so the workbench focus would stay where it last was.
  // Read from the store rather than from a subscription: this asks about the
  // focus at the moment of the click, and nothing here draws it.
  const activate = () => {
    if (!entry.spec.activates || store.get().focus === id) return;
    dispatch({ type: 'focus', panel: id, by: 'user' });
  };

  return (
    <div
      ref={(el) => {
        layer.body(id, el);
        return () => layer.body(id, null);
      }}
      id={panelDomId(id)}
      role={entry.spec.role}
      aria-labelledby={entry.spec.labelledBy}
      // Out of the accessibility tree and out of tab order while nothing is
      // showing it, which `hidden` on the panel element used to give.
      aria-hidden={hidden || undefined}
      inert={hidden}
      className={styles.panelBody}
      data-panel={id}
      data-shape={entry.spec.shape}
      data-anchored={entry.spec.anchored || undefined}
      // Kept laid out rather than display:none, so a panel coming back to the
      // front is not a fresh layout for whatever it holds.
      style={{ visibility: hidden ? 'hidden' : undefined }}
      onPointerDownCapture={activate}
      onFocusCapture={activate}
    >
      <PanelHost panel={entry.panel} />
    </div>
  );
}
