import { localPlugin } from '../../../workbench/host/local';
import config from './plugin.config';

export const koros = localPlugin({
  config,
  background: () => import('./background').then((m) => m.default),
  route: () => import('./route').then((m) => m.default),
  pane: () => import('./pane').then((m) => m.default),
  commands: () => import('./commands').then((m) => m.default),
  prompt: () => import('./prompt').then((m) => m.default),
});
