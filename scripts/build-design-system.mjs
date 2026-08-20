#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  renameSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const srcRoot = join(repoRoot, 'src/design-system');
const distRoot = join(repoRoot, 'dist-design-system');

if (!existsSync(distRoot)) {
  console.error(`expected ${distRoot} to exist (run vite build first)`);
  process.exit(1);
}

const rootPkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const version = process.env.DS_VERSION ?? rootPkg.version;
// CI sets DS_VERSION from the release tag; a local `npm run
// build:design-system` doesn't. Mark local builds private so
// `npm publish` from the dist refuses.
const isPublishBuild = Boolean(process.env.DS_VERSION);

const cssAssets = [
  'global.css',
  'fonts.css',
  'tokens/tokens.css',
  'tokens/prism-kbase.css',
  'tokens/utilities.css',
];

for (const rel of cssAssets) {
  const from = join(srcRoot, rel);
  const to = join(distRoot, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

// Bundle everything into a single `style.css`: tokens + utilities +
// global resets + component styles, in load order. Vite emits the
// component styles to `style.css`; rename it first, then concat.
renameSync(join(distRoot, 'style.css'), join(distRoot, 'components.css'));
// fonts.css is left out: bare specifiers need a bundler to resolve them.
const allInOneOrder = [
  'tokens/tokens.css',
  'tokens/prism-kbase.css',
  'tokens/utilities.css',
  'global.css',
  'components.css',
];
const combined = allInOneOrder.map((rel) => readFileSync(join(distRoot, rel), 'utf8')).join('\n');
writeFileSync(join(distRoot, 'style.css'), combined);

const pkg = {
  name: '@kbase/design-system',
  version,
  ...(isPublishBuild ? {} : { private: true }),
  description:
    'KBase design system: components, tokens, and styles. Canonical source lives in kbase/next-gen-ui.',
  type: 'module',
  // Tree-shake JS but keep CSS imports.
  sideEffects: ['*.css'],
  main: './index.js',
  module: './index.js',
  types: './types/index.d.ts',
  exports: {
    '.': {
      types: './types/index.d.ts',
      import: './index.js',
    },
    './style.css': './style.css',
    './components.css': './components.css',
    './global.css': './global.css',
    './fonts.css': './fonts.css',
    './tokens/tokens.css': './tokens/tokens.css',
    './tokens/prism-kbase.css': './tokens/prism-kbase.css',
    './tokens/utilities.css': './tokens/utilities.css',
  },
  files: [
    'fonts.css',
    'index.js',
    'index.js.map',
    'style.css',
    'components.css',
    'global.css',
    'tokens/',
    'types/',
    'README.md',
  ],
  dependencies: {
    '@fontsource/oxygen': rootPkg.dependencies['@fontsource/oxygen'],
    '@fontsource/fira-code': rootPkg.dependencies['@fontsource/fira-code'],
  },
  peerDependencies: {
    react: rootPkg.dependencies.react,
    'react-dom': rootPkg.dependencies['react-dom'],
    '@base-ui/react': rootPkg.dependencies['@base-ui/react'],
    '@phosphor-icons/react': rootPkg.dependencies['@phosphor-icons/react'],
    prismjs: rootPkg.dependencies.prismjs,
  },
  repository: {
    type: 'git',
    url: 'git+https://github.com/kbase/next-gen-ui.git',
    directory: 'src/design-system',
  },
  publishConfig: {
    registry: 'https://npm.pkg.github.com',
  },
  license: 'MIT',
};

writeFileSync(join(distRoot, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

const dsReadme = join(srcRoot, 'README.md');
if (existsSync(dsReadme)) {
  copyFileSync(dsReadme, join(distRoot, 'README.md'));
}

console.log('design-system: post-build complete');
console.log(
  '  version:',
  pkg.version,
  process.env.DS_VERSION ? '(from DS_VERSION)' : '(from root package.json)',
);
console.log('  out:    ', distRoot);
