import { CONTRACT_VERSION } from '../../../plugins/sdk';
import type { InstalledPlugin } from '../installed';

// Installed by the host itself, over the same index as everything else.
// A document rather than a navigator: what is installed is read now and
// then, so it costs the sidebar a permanent block for nothing. The
// shortcut is how it is reached.
export const catalog: InstalledPlugin = {
  manifest: {
    id: 'catalog',
    title: 'Catalog',
    description: 'Installed plugins, what is pinned, and the assistant setting.',
    contractVersion: CONTRACT_VERSION,
    icon: 'SquaresFour',
    document: { route: '/' },
    commands: [
      {
        name: 'catalog',
        title: 'Open the plugin catalog',
        icon: 'SquaresFour',
        shortcut: 'Catalog',
      },
    ],
  },
  load: async () => ({
    document: (await import('./Catalog')).CatalogDocument,
    commands: (await import('./commands')).commands,
  }),
};
