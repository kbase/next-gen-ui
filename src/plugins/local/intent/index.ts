import { localPlugin } from '../../../workbench/host/local';
import config from './plugin.config';

export const intentPlugin = localPlugin({
  config,
  background: () => import('./background').then((m) => m.default),
  intent: () => import('./intent').then((m) => m.default),
});
