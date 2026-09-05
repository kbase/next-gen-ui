import type { Manifest } from '../../sdk';
import { CONTRACT_VERSION } from '../../sdk';

export const manifest: Manifest = {
  id: 'jobs',
  title: 'Jobs',
  description: 'Background work: queued, running and finished jobs.',
  contractVersion: CONTRACT_VERSION,
  icon: 'ListChecks',
  color: 'orange',
  navigator: {},
  document: { route: '/job/$id' },
  commands: [
    {
      name: 'cancel',
      title: 'Cancel a job',
      args: [{ name: 'id', type: 'string', required: true, description: 'job id' }],
    },
  ],
};
