import type { Manifest } from '../../sdk';
import { CONTRACT_VERSION } from '../../sdk';

export const manifest: Manifest = {
  id: 'genknown',
  title: 'GenKnown',
  description: 'Genome knowledge browser.',
  contractVersion: CONTRACT_VERSION,
  icon: 'GraduationCap',
  color: 'purple',
  // One page, so the document has no params.
  document: { route: '/' },
};
