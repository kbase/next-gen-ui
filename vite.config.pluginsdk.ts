import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds @kbase/plugin-sdk as a three-entry library:
//   .        the runtime surface a plugin imports (the define* helpers,
//            fromReact, the hooks); reaches React and the design system
//   ./config the contract alone (definePluginManifest, the schemas), for
//            plugin.config.ts, which the build loads in Node
//   ./vite   the build-time preset (pluginFederation), which pulls in
//            @module-federation/vite and so must not be reachable from `.`
//
// Everything the host shares as a singleton is external here: the built
// SDK reaches the host's copy at runtime, and a plugin that bundled its own
// would be the bug the singleton list exists to prevent.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist-plugin-sdk',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/plugins/sdk/index.ts', import.meta.url)),
        config: fileURLToPath(new URL('./src/plugins/sdk/contract.ts', import.meta.url)),
        vite: fileURLToPath(new URL('./src/plugins/sdk/pluginFederation.ts', import.meta.url)),
      },
      formats: ['es'],
    },
    rollupOptions: {
      // Each must also be a peerDependency in scripts/build-plugin-sdk.mjs.
      external: [
        'react',
        'react/jsx-runtime',
        /^react-dom($|\/)/,
        'zod',
        /^@phosphor-icons\/react($|\/)/,
        /^@kbase\/design-system($|\/)/,
        /^@module-federation\/vite($|\/)/,
        'vite',
        // The preset runs in Node and reads the plugin's package.json; a
        // library build otherwise replaces a Node builtin with an empty stub.
        /^node:/,
      ],
    },
  },
});
