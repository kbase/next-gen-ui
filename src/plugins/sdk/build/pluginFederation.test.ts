import { describe, expect, it, vi } from 'vitest';
import type { ModuleFederationOptions } from '@module-federation/vite';
import type { Plugin } from 'vite';
import { SDK_VERSION, ManifestSchema, manifestFor } from '../contract';
import { pluginFederation } from './pluginFederation';
import { SHARED_SINGLETONS } from './shared';

// The preset's whole output is the argument it hands `federation()`, so the
// mock carries that function's signature and `mock.calls` stays typed.
const federation = vi.hoisted(() =>
  vi.fn<(options: ModuleFederationOptions) => Plugin[]>(() => []),
);
vi.mock('@module-federation/vite', () => ({ federation }));

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

// A plugin runs only inside the workbench, so it takes every singleton from
// the host and bundles no fallback. Getting this wrong is silent at build
// time and surfaces as "Invalid hook call" when the remote loads.
describe('pluginFederation', () => {
  const options = () => {
    federation.mockClear();
    pluginFederation({
      config: { id: 'hello', title: 'Hello', launcher: { label: 'Hello', command: 'hello' } },
      route: './src/route.tsx',
    });
    return federation.mock.calls[0][0];
  };

  // One manifest: the federation plugin writes its own as manifest.json and
  // is handed the plugin's fields to add. The stats file, the second call,
  // is left alone. The entry keeps the federation plugin's hashed name.
  it('writes the plugin into the federation manifest and hashes the entry', async () => {
    const { manifest, filename, name, exposes } = options();
    expect(name).toBe('hello');
    expect(filename).toBeUndefined();
    expect(exposes).toEqual({ './route': './src/route.tsx' });
    if (typeof manifest !== 'object' || !manifest?.additionalData) throw new Error('no manifest options');
    expect(manifest.fileName).toBe('manifest.json');
    const mf = { id: 'hello', name: 'hello', metaData: { remoteEntry: { name: 'remoteEntry-x.js' } } };
    const written = await manifest.additionalData({ stats: mf, pluginOptions: {}, bundler: 'vite' });
    expect(written).toEqual({
      ...mf,
      id: 'hello',
      title: 'Hello',
      launcher: { label: 'Hello', command: 'hello' },
      sdkVersion: SDK_VERSION,
      modules: ['route'],
    });
    expect(ManifestSchema.safeParse(written).success).toBe(true);
    const stats = { id: 'hello', stats: true };
    expect(
      await manifest.additionalData({ stats, manifest: mf, pluginOptions: {}, bundler: 'vite' }),
    ).toBe(stats);
  });

  it('shares every host singleton with no local fallback', () => {
    const { shared } = options();
    expect(shared).toEqual(
      Object.fromEntries(
        Object.keys(SHARED_SINGLETONS).map((name) => [
          name,
          expect.objectContaining({ singleton: true, import: false }),
        ]),
      ),
    );
  });
});
