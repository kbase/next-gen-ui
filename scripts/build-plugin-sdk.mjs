#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  existsSync,
  copyFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const distRoot = join(repoRoot, 'dist-plugin-sdk');

if (!existsSync(distRoot)) {
  console.error(`expected ${distRoot} to exist (run vite build first)`);
  process.exit(1);
}

// shared.ts imports the repo-root package.json, so tsc roots the declarations
// at the repo and nests them under types/src/plugins/sdk/. Flatten to types/.
const nested = join(distRoot, 'types/src/plugins/sdk');
if (existsSync(nested)) {
  for (const f of readdirSync(nested)) renameSync(join(nested, f), join(distRoot, 'types', f));
  rmSync(join(distRoot, 'types/src'), { recursive: true, force: true });
}

const rootPkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
// CI sets SDK_VERSION from the release tag; a local build does not. Local
// builds are marked private so `npm publish` from the dist refuses.
const version = process.env.SDK_VERSION ?? rootPkg.version;
const isPublishBuild = Boolean(process.env.SDK_VERSION);
const dep = (name) => rootPkg.dependencies[name] ?? rootPkg.devDependencies[name];

const pkg = {
  name: '@kbase/plugin-sdk',
  version,
  ...(isPublishBuild ? {} : { private: true }),
  description:
    'SDK for next-gen-ui workbench plugins: the manifest contract, panel hooks, and the Module Federation preset.',
  type: 'module',
  exports: {
    '.': { types: './types/index.d.ts', import: './index.js' },
    './vite': { types: './types/pluginFederation.d.ts', import: './vite.js' },
  },
  files: ['index.js', 'index.js.map', 'vite.js', 'vite.js.map', 'types/', 'README.md'],
  sideEffects: false,
  // Keep in step with rollupOptions.external in vite.config.pluginsdk.ts.
  peerDependencies: {
    react: dep('react'),
    'react-dom': dep('react-dom'),
    zod: dep('zod'),
    '@module-federation/vite': dep('@module-federation/vite'),
  },
  peerDependenciesMeta: { '@module-federation/vite': { optional: true } },
  repository: {
    type: 'git',
    url: 'https://github.com/kbase/next-gen-ui.git',
    directory: 'src/plugins/sdk',
  },
  publishConfig: { registry: 'https://npm.pkg.github.com' },
  license: 'MIT',
};

writeFileSync(join(distRoot, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

const readme = join(repoRoot, 'src/plugins/sdk/README.md');
if (existsSync(readme)) copyFileSync(readme, join(distRoot, 'README.md'));

console.log('plugin-sdk:', pkg.version, isPublishBuild ? '(publish)' : '(private)', '→', distRoot);
