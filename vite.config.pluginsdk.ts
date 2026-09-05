import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds @kbase/plugin-sdk as a two-entry library:
//   .      the runtime surface a plugin imports (contract, definePlugin, hooks)
//   ./vite the build-time preset (pluginFederation), which pulls in
//          @module-federation/vite and so must not be reachable from `.`
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
        /^@module-federation\/vite($|\/)/,
      ],
    },
  },
});
