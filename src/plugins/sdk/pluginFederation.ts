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
      shared: HOST_PROVIDED,
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

// Every host singleton, taken from the host and never bundled. `import:
// false` is the share without a local fallback: the module resolves through
// the share scope the workbench initialized, and this build emits no copy of
// its own. That is what these remotes want — they run only inside the
// workbench, so a fallback copy is weight that never loads, and for react
// and the design system a second copy that does load breaks hook and context
// identity.
//
// A singleton the plugin has not installed is still shared. Not installing
// it costs only the named exports the build would otherwise read from the
// package to bind — and a plugin that imports from a package it has not
// installed fails `tsc` before vite runs. That leaves one warning per
// uninstalled singleton on a build that is working as intended, which
// `suppressMissingImportWarning` turns off.
const HOST_PROVIDED = Object.fromEntries(
  Object.entries(SHARED_SINGLETONS).map(([name, config]) => [
    name,
    { ...config, import: false as const, suppressMissingImportWarning: true },
  ]),
);
