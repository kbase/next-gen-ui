import { localPlugins } from '../plugins/local';
import { createWorkbench } from '../workbench/host';
import type { WorkbenchServices } from '../workbench/react';

// Router context for tests: the bundled plugins and no persistence.
export function testWorkbench(): WorkbenchServices {
  return createWorkbench({
    installed: localPlugins,
    storage: null,
    defaultPinned: ['koros', 'data', 'jobs'],
    defaultAssistant: 'koros',
  });
}
