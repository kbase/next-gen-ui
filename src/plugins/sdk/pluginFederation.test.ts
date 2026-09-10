import { describe, expect, it } from 'vitest';
import { SDK_VERSION, ManifestSchema, manifestFor } from './contract';

// What the build writes beside remoteEntry.js, and what localPlugin computes
// for a bundled plugin: the same function.
describe('manifestFor', () => {
  const config = { id: 'hello', title: 'Hello', launcher: { label: 'Hello', command: 'hello' } };

  it('stamps the contract version and lists the named modules in contract order', () => {
    const manifest = manifestFor(config, ['commands', 'route']);
    expect(manifest.sdkVersion).toBe(SDK_VERSION);
    expect(manifest.modules).toEqual(['route', 'commands']);
    expect(ManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('refuses a config the host would refuse', () => {
    expect(() => manifestFor({ ...config, id: 'Hello' }, ['route'])).toThrow();
  });
});
