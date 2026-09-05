import type { Manifest } from '../../sdk';
import { CONTRACT_VERSION } from '../../sdk';

export const manifest: Manifest = {
  id: 'function-junction',
  title: 'Function Junction',
  description: 'Per-protein evidence report card.',
  contractVersion: CONTRACT_VERSION,
  icon: 'Flask',
  color: 'green',
  // One page, so the document has no params.
  document: { route: '/' },
};
