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
    // A plugin module exports components and its definePlugin() default
    // together on purpose: that object is what the host loads. HMR for
    // plugin code goes through the panel, not fast refresh.
    files: ['src/plugins/local/**/plugin.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // The workbench's layout model and command registry are plain TypeScript
    // so they can be tested without a DOM and read without React knowledge.
    files: ['src/workbench/core/**/*.ts', 'src/workbench/commands/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*', '@tanstack/*', '@kbase/*'],
              message: 'src/workbench/core and src/workbench/commands stay framework-free.',
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
