import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
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
        // Deploy config placeholders, substituted when the container starts
        // (docker-entrypoint.d/05-render-config.sh) so one image serves every
        // environment. Build-only: in dev the tags are absent and src/config.ts
        // falls back to import.meta.env. Meta rather than an inline script
        // because CSP would demand a per-environment hash for the latter.
        name: 'runtime-config',
        apply: 'build' as const,
        transformIndexHtml: () => [
          {
            tag: 'meta',
            attrs: { name: 'config:auth-origin', content: '__AUTH_ORIGIN__' },
            injectTo: 'head-prepend' as const,
          },
          {
            tag: 'meta',
            attrs: { name: 'config:cookie-domain', content: '__COOKIE_DOMAIN__' },
            injectTo: 'head-prepend' as const,
          },
        ],
      },
      {
        // Stamps data-theme from localStorage before the first paint, so a
        // dark-theme user gets no light flash. Inlined rather than imported
        // because it has to run before the bundle loads.
        name: 'theme-init',
        transformIndexHtml: () => [
          { tag: 'script', children: themeInitScript, injectTo: 'head-prepend' as const },
        ],
        // The CSP blocks inline scripts, so the one above needs its hash in
        // `script-src` or it silently never runs (dev has no CSP, so the
        // breakage only shows up behind nginx). Emitted for the Dockerfile's
        // conf stage rather than hardcoded, so editing the script above can't
        // leave a stale hash behind.
        writeBundle: () => {
          const hash = createHash('sha256').update(themeInitScript).digest('base64');
          writeFileSync('.csp-script-hash', `sha256-${hash}`);
        },
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
