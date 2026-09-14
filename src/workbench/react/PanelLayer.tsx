import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { InPortal } from 'react-reverse-portal';
import { PanelHost } from './PanelHost';
import { createPanelLayer, PanelLayerContext } from './panelSlots';

// Holds every panel's contents. Each is rendered into a detached element of
// its own and attached inside the slot that is drawing the panel, so a panel
// is inside the block or tab a reader sees it in, and a move re-parents that
// element rather than rebuilding what is in it. Nothing here is drawn where
// it is written: an InPortal renders into its node and contributes no element
// of its own. See panelSlots.ts for the register behind it.
export function PanelLayer({ children }: { children: ReactNode }) {
  const layer = useMemo(() => createPanelLayer(), []);
  useSyncExternalStore(layer.subscribe, layer.version, layer.version);

  // After every slot in this commit has claimed or released: a parent's
  // layout effect runs after its children's.
  useLayoutEffect(() => {
    layer.settle();
  });

  return (
    <PanelLayerContext value={layer}>
      {children}
      {layer.entries().map((entry) => (
        <InPortal key={entry.panel.id} node={entry.node}>
          <PanelHost panel={entry.panel} />
        </InPortal>
      ))}
    </PanelLayerContext>
  );
}
