import type { Manifest } from '../../../plugins/sdk';

// An app is a plugin with a launcher: a command the manifest says opens it
// with nothing typed. Without one there is nothing for a list to run.
export const isApp = (m: Manifest) => Boolean(m.launcher);
