import { localPlugins } from '../plugins/local';
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
