import type { Manifest } from '../../sdk';
import { CONTRACT_VERSION } from '../../sdk';

export const manifest: Manifest = {
  id: 'data',
  title: 'Data',
  description: 'The Data home: datasets by provenance, including the KBase 1.0 bridge.',
  contractVersion: CONTRACT_VERSION,
  icon: 'Database',
  color: 'teal',
  navigator: {},
  document: { route: '/data/$ref' },
};
