import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-design-system',
      'dist-plugin-sdk',
      'build',
      'coverage',
      'src/routeTree.gen.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // TanStack Router file-based routes intentionally export both `Route`
    // and the component from the same file; HMR works for these via the
    // router plugin, so the react-refresh check is a false positive here.
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // A route or pane module's default export is a Route or Pane — the
    // object the host mounts — beside the component it wraps. That is the
    // contract's file shape; HMR for plugin code goes through the panel,
    // not fast refresh.
    files: ['src/plugins/local/**/route.tsx', 'src/plugins/local/**/pane.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // The workbench is five layers, and imports run one way through them:
  // core → commands → host → react → compose. The three blocks below are
  // that sentence as a check; each names the arrows its layer may not draw.
  // A specifier with a `react` path segment covers the package, its
  // jsx-runtime, `@phosphor-icons/react`, `@base-ui/react/*` and the
  // workbench's own `react/` directory in one pattern.
  {
    // The workbench's layout model and command registry are plain TypeScript
    // so they can be tested without a DOM and read without React knowledge.
    files: ['src/workbench/core/**/*.ts', 'src/workbench/commands/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/react', '**/react/**', 'react-dom', 'react-dom/**', '@tanstack/**'],
              message: 'src/workbench/core and src/workbench/commands stay framework-free.',
            },
            {
              group: ['@kbase/design-system', '@kbase/design-system/**'],
              message: 'src/workbench/core and src/workbench/commands render nothing.',
            },
            {
              group: [
                '**/workbench/host/**',
                '../host',
                '../host/**',
                '../compose',
                '../compose/**',
              ],
              message: 'core and commands are below the host; the host imports them.',
            },
            {
              // The layout model speaks the plugin contract's vocabulary
              // (CartItem, Offer, Match), and those names are erased at
              // compile time. Importing a value from the SDK would pull
              // React in behind it.
              group: ['**/plugins/sdk', '**/plugins/sdk/**'],
              allowTypeImports: true,
              message: 'core and commands may name SDK types, not import its code.',
            },
          ],
        },
      ],
    },
  },
  {
    // The host builds and holds what a workbench is made of; it draws none
    // of it. Nothing under here may reach for React, so a component cannot
    // be written in this directory and the react → host arrow cannot come
    // back the other way.
    files: ['src/workbench/host/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/react', '**/react/**', 'react-dom', 'react-dom/**'],
              message:
                'src/workbench/host holds no components: the React layer imports the host, not the other way round.',
            },
            {
              // `ToastManager` names a queue a plugin's `notify` pushes to,
              // and the name is erased at compile time. A value from the
              // design system would be a component.
              group: ['@kbase/design-system', '@kbase/design-system/**'],
              allowTypeImports: true,
              message: 'src/workbench/host renders nothing.',
            },
            {
              group: ['../compose', '../compose/**'],
              message:
                'the composition root is above the host; it imports the host to build a workbench.',
            },
          ],
        },
      ],
    },
  },
  {
    // Components reach the workbench they are drawing through
    // `useServices()`. Importing the builder is how host and react came to
    // depend on each other in the first place. Tests are exempt: building a
    // real workbench is what they are for.
    files: ['src/workbench/react/**/*.{ts,tsx}'],
    ignores: ['src/workbench/react/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/compose', '**/compose/**'],
              message:
                'a component takes its workbench from `useServices()`; only the composition root builds one.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
);
