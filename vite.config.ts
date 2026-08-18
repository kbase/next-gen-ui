import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { themeInitScript } from './src/design-system/theme/useTheme';

// `@kbase/design-system` is the public name; the canonical source
// lives in this repo at `src/design-system/`. Keep this alias in
// sync with `tsconfig.json`'s `paths` so bundler and typecheck
// resolve the same way.
const designSystemSrc = fileURLToPath(new URL('./src/design-system', import.meta.url));

export default defineConfig(({ mode }) => {
  // .env files are loaded into import.meta.env for the client by
  // default; loadEnv brings them into the config too so allowedHosts
  // honors VITE_DEV_ALLOWED_HOSTS from .env.development.local.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routeFileIgnorePattern: '\\.(test|spec)\\.[tj]sx?$',
      }),
      react(),
      {
        // Stamps data-theme from localStorage before the first paint, so a
        // dark-theme user gets no light flash. Inlined rather than imported
        // because it has to run before the bundle loads.
        name: 'theme-init',
        transformIndexHtml: () => [
          { tag: 'script', children: themeInitScript, injectTo: 'head-prepend' as const },
        ],
      },
    ],
    resolve: {
      alias: {
        '@kbase/design-system': designSystemSrc,
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    server: {
      host: true,
      port: 3000,
      // Comma-separated. Leading dot is Vite's subdomain wildcard
      // (`.example.com`). Personal dev hostnames go in
      // .env.development.local, not source.
      allowedHosts:
        env.VITE_DEV_ALLOWED_HOSTS?.split(',')
          .map((h) => h.trim())
          .filter(Boolean) ?? [],
      // Forward auth-service paths through the dev server so requests
      // are same-origin from the browser. The Origin header rewrite
      // matters because ci.kbase.us inspects it for policy decisions
      // and rejects (403) requests with the dev-server origin.
      proxy: env.VITE_DEV_AUTH_PROXY
        ? {
            '/services/auth': {
              target: env.VITE_DEV_AUTH_PROXY,
              changeOrigin: true,
              secure: true,
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  // Strip the locally-set kbase_session cookie (it
                  // was set on the dev origin; the auth service
                  // wouldn't recognize it anyway — Authorization
                  // header carries the bearer).
                  proxyReq.removeHeader('cookie');
                  proxyReq.setHeader('Origin', env.VITE_DEV_AUTH_PROXY);
                  proxyReq.setHeader('Referer', env.VITE_DEV_AUTH_PROXY + '/');
                  // Cloudflare's bot manager challenges browser UAs
                  // without a __cf_bm cookie; that cookie can't
                  // round-trip through this proxy (Domain mismatch).
                  // A non-browser UA is on the API allowlist.
                  proxyReq.setHeader('User-Agent', 'kbase-frontend-dev-proxy');
                });
              },
            },
          }
        : undefined,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  };
});
