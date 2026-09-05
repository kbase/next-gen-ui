import type { InstalledPlugin } from '../../../workbench/host/installed';
import { manifest } from './manifest';
import { match } from './match';

export const functionJunction: InstalledPlugin = {
  manifest,
  load: () => import('./plugin').then((m) => m.default),
  match,
};
