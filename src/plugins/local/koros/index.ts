import type { InstalledPlugin } from '../../../workbench/host/installed';
import { manifest } from './manifest';

export const koros: InstalledPlugin = {
  manifest,
  load: () => import('./plugin').then((m) => m.default),
};
