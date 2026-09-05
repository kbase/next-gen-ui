import { CONTRACT_VERSION } from '../../../plugins/sdk';
import type { InstalledPlugin } from '../installed';

// Installed by the host itself, over the same index as everything else.
export const shortcutsPlugin: InstalledPlugin = {
  manifest: {
    id: 'shortcuts',
    title: 'Shortcuts',
    description: "Every installed plugin's shortcut commands, as buttons.",
    contractVersion: CONTRACT_VERSION,
    icon: 'Lightning',
    navigator: { fit: 'content' },
  },
  load: () => import('./Shortcuts').then((m) => ({ navigator: m.ShortcutsNavigator })),
};
