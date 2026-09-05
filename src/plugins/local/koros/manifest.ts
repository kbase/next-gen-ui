import type { Manifest } from '../../sdk';
import { CONTRACT_VERSION } from '../../sdk';

export const manifest: Manifest = {
  id: 'koros',
  title: 'KOROS',
  description: 'The assistant: projects, arcs and the questions asked in them.',
  contractVersion: CONTRACT_VERSION,
  icon: 'ChatCircleDots',
  color: 'blue',
  navigator: {},
  document: { route: '/arc/$slug' },
  promptHandler: true,
  commands: [
    { name: 'new-question', title: 'Start a new arc for a question', shortcut: 'New arc' },
  ],
};
