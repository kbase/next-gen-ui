import { describe, expect, it } from 'vitest';
import type { Manifest } from '../../../plugins/sdk';
import { SDK_VERSION } from '../../../plugins/sdk';
import { isApp } from './apps';

// Which installed plugins the launcher can offer as an app: those whose
// manifest names a command to run with nothing typed. A document alone is
// not enough — a route that names a value can only be reached by a link
// that already knows the value, so a list would have nothing to open.

const manifest = (id: string, launcher?: Manifest['launcher']): Manifest => ({
  id,
  title: id,
  description: '',
  sdkVersion: SDK_VERSION,
  modules: ['route'],
  launcher,
});

describe('apps on the launcher', () => {
  it('offers a plugin with a launcher', () => {
    expect(isApp(manifest('function-junction', { label: 'Open', command: 'open' }))).toBe(true);
  });

  it('withholds one without, whatever else it declares', () => {
    expect(isApp(manifest('koros'))).toBe(false);
  });
});
