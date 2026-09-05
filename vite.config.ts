import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { federation } from '@module-federation/vite';
import { themeInitScript } from './src/design-system/theme/useTheme';
import { SHARED_SINGLETONS } from './src/plugins/sdk/shared';
import { localManifests } from './src/plugins/local/manifests';

// `@kbase/design-system` is the public name; the canonical source
// lives in this repo at `src/design-system/`. Keep this alias in
// sync with `tsconfig.json`'s `paths` so bundler and typecheck
// resolve the same way.
const designSystemSrc = fileURLToPath(new URL('./src/design-system', import.meta.url));

// `/services/function-junction=http://127.0.0.1:8771` — one entry per backend
// serving its own plugin. Same shape nginx is given in the container.
function serviceProxies(spec: string | undefined) {
  const entries = (spec ?? '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const at = pair.indexOf('=');
      if (at < 1) throw new Error(`VITE_DEV_SERVICE_PROXY entry is not <prefix>=<origin>: ${pair}`);
      return [pair.slice(0, at), { target: pair.slice(at + 1), changeOrigin: false }] as const;
    });
  return Object.fromEntries(entries);
}

export default defineConfig(({ mode }) => {
  // .env files are loaded into import.meta.env for the client by
  // default; loadEnv brings them into the config too so allowedHosts
  // honors VITE_DEV_ALLOWED_HOSTS from .env.development.local.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      // Module Federation host. Remotes are registered at runtime from the
      // registry, so none are declared here; the shared list is the SDK's.
      // Vitest gets no federation runtime: nothing in tests loads a remote.
      ...(mode === 'test'
        ? []
        : [federation({ name: 'host', remotes: {}, shared: SHARED_SINGLETONS, dts: false })]),
      {
        // Dev stand-in for the registry: the bundled manifests, so the fetch
        // and merge path runs against real data. The container proxies this
        // path to the registry service instead (nginx.conf).
        name: 'local-plugin-registry',
        apply: 'serve' as const,
        configureServer(server) {
          server.middlewares.use('/plugin-registry/plugins', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            // A proxied service publishes its own manifest, so a plugin under
            // development is registered by running its backend rather than by
            // editing this repo. Asked for on each request: restarting the
            // service is enough, no dev-server restart.
            const proxied = Object.keys(serviceProxies(env.VITE_DEV_SERVICE_PROXY));
            Promise.all(
              proxied.map(async (prefix) => {
                try {
                  const answer = await fetch(`http://127.0.0.1:${server.config.server.port}${prefix}/manifest.json`);
                  return answer.ok ? await answer.json() : undefined;
                } catch {
                  return undefined;
                }
              }),
            ).then((manifests) => {
              res.end(JSON.stringify([...localManifests, ...manifests.filter(Boolean)]));
            });
          });
        },
      },
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
        // Same idea for the plugin SDK: local plugins import the name external
        // plugins will install, and Module Federation shares one instance of it.
        '@kbase/plugin-sdk': fileURLToPath(new URL('./src/plugins/sdk/index.ts', import.meta.url)),
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
      proxy: {
        // A plugin served by its own backend. In the container nginx proxies
        // this prefix; in dev the dev server does, so a remote entry stays
        // same-origin either way and `script-src 'self'` keeps covering it.
        // VITE_DEV_SERVICE_PROXY is `<prefix>=<origin>`, comma-separated.
        ...serviceProxies(env.VITE_DEV_SERVICE_PROXY),
        ...(env.VITE_DEV_AUTH_PROXY
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
          : {}),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  };
});
