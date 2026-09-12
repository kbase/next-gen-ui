import { waitFor } from '@testing-library/react';
import { localPlugins } from '../plugins/local';
import type { PanelId } from '../workbench/core';
import { panelDomId } from '../workbench/react/domIds';
import { noPersistence } from '../workbench/host';
import { createWorkbench } from '../workbench/compose';
import type { CreateWorkbenchOptions } from '../workbench/compose/createWorkbench';
import type { WorkbenchServices } from '../workbench/host';
import { DEFAULT_ASSISTANT, DEFAULT_INTENT, DEFAULT_PINNED } from '../workbenchDefaults';

// Router context for tests: the bundled plugins, no persistence, and the
// same starting layout the app ships. A test after a different layout
// passes its own `defaultPinned`/`defaultAssistant`/`defaultIntent` here
// rather than editing the default.
export function testWorkbench(
  overrides: Partial<
    Pick<CreateWorkbenchOptions, 'defaultPinned' | 'defaultAssistant' | 'defaultIntent'>
  > = {},
): WorkbenchServices {
  return createWorkbench({
    installed: localPlugins,
    persistence: noPersistence,
    defaultPinned: [...DEFAULT_PINNED],
    defaultAssistant: DEFAULT_ASSISTANT,
    defaultIntent: DEFAULT_INTENT,
    ...overrides,
  });
}

// A panel's body is drawn in the panel layer, laid over the slot its place in
// the layout measures out, so it is not inside the tab strip or the sidebar
// block that places it. The chrome names it by id — `aria-controls` on a tab,
// `aria-owns` on a block — which DOM queries do not follow, so a query about
// what a panel is showing starts here.
export const panelBody = (id: PanelId): Promise<HTMLElement> =>
  waitFor(() => {
    const el = document.getElementById(panelDomId(id));
    if (!el) throw new Error(`no body is drawn for panel ${id}`);
    return el;
  });
