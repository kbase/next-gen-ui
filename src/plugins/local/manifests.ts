import type { Manifest } from '../sdk';
import { manifest as data } from './data/manifest';
import { manifest as functionJunction } from './function-junction/manifest';
import { manifest as genknown } from './genknown/manifest';
import { manifest as jobs } from './jobs/manifest';
import { manifest as koros } from './koros/manifest';

// Manifests alone, with no React behind them: the dev registry middleware in
// vite.config serves this list so the fetch path runs against real data.
export const localManifests: Manifest[] = [koros, data, jobs, functionJunction, genknown];
