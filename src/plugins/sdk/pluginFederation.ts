import { readFileSync } from 'node:fs';
import { federation } from '@module-federation/vite';
import type { Plugin } from 'vite';
import type { Module, PluginConfig } from './contract';
import { MODULES, manifestFor } from './contract';
import { SHARED_SINGLETONS } from './shared';

// A plugin's vite.config:
//
//   import config from './plugin.config';
//   plugins: [pluginFederation({ config, route: './src/route.tsx' }), react()]
//
// Each named file becomes a federation module under its own name —
// `./route`, `./background` — and the build writes manifest.json beside
// remoteEntry.js: the config, this SDK's contract version, and the modules
// that were named. A file not named here is not part of the plugin,
// whatever it exports.
export type PluginFederationOptions = { config: PluginConfig } & { [K in Module]?: string };

export function pluginFederation({ config, ...paths }: PluginFederationOptions): Plugin[] {
  const named = MODULES.filter((m) => paths[m] !== undefined);
  const manifest = manifestFor(config, named);
  return [
    ...federation({
      name: manifest.id,
      filename: 'remoteEntry.js',
      manifest: true,
      exposes: Object.fromEntries(named.map((m) => [`./${m}`, paths[m]!])),
      shared: sharedFor(declaredDependencies()),
      dts: false,
    }),
    {
      name: 'kbase-plugin-manifest',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: JSON.stringify(manifest, null, 2) + '\n',
        });
      },
    },
  ];
}

// The host's singletons, as a plugin shares them: those the plugin depends
// on. One it does not depend on — the router, for a plugin that draws no
// routes — is left out; the plugin imports nothing from it, so there is
// nothing to share, and listing it would make the build look for a copy
// that is not there.
function sharedFor(declared: ReadonlySet<string>) {
  return Object.fromEntries(
    Object.entries(SHARED_SINGLETONS).filter(([name]) => declared.has(name)),
  );
}

function declaredDependencies(): Set<string> {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Record<
      'dependencies' | 'devDependencies' | 'peerDependencies',
      Record<string, string> | undefined
    >;
    return new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ]);
  } catch {
    return new Set();
  }
}
