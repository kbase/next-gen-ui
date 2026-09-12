import { describe, expect, it, vi } from 'vitest';
import type { ModuleFederationOptions } from '@module-federation/vite';
import type { Plugin } from 'vite';
import { SDK_VERSION, ManifestSchema, manifestFor } from './contract';
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
  it('shares every host singleton with no local fallback', () => {
    federation.mockClear();
    pluginFederation({
      config: { id: 'hello', title: 'Hello', launcher: { label: 'Hello', command: 'hello' } },
      route: './src/route.tsx',
    });

    const { shared } = federation.mock.calls[0][0];
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
