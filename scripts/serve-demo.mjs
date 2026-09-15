// Serve the built app the way the container does, for a demo over a funnel.
//
// `vite preview` is not enough: the service proxies and the plugin registry
// are dev-server middleware (`apply: 'serve'` in vite.config), and the built
// image serves neither — a deployment fronts `/services/*` and
// `/plugin-registry/plugins` with something else. This script is that
// something for a demo: without it every federated plugin fails to load.
//
// The dev server is also the wrong thing to put in front of a phone. It ships
// the module graph unbundled: a page costs ~430 requests and holds every module
// separately, which mobile Safari kills. `dist` is the same app in a dozen
// files.
//
//   node scripts/serve-demo.mjs [port]
//
// Reads the same VITE_DEV_SERVICE_PROXY as the dev server, so a plugin backend
// is registered by running it, not by editing this file.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { connect as netConnect } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.argv[2] ?? 8931);

// `<prefix>=<origin>`, comma-separated — the same spelling vite.config reads.
function serviceProxies(spec) {
  const out = {};
  for (const entry of (spec ?? '').split(',')) {
    const [prefix, origin] = entry.split('=').map((s) => s?.trim());
    if (prefix?.startsWith('/') && origin) out[prefix] = origin;
  }
  return out;
}

async function env() {
  // Not dotenv: one file, two keys, no need for the dependency.
  const out = {};
  for (const name of ['.env.development.local', '.env.local', '.env']) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    for (const line of (await readFile(path, 'utf8')).split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !(m[1] in out)) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

const config = await env();
const proxies = serviceProxies(config.VITE_DEV_SERVICE_PROXY);

// Only the plugins served by their own backends. The host bundles its own
// (`main.tsx` merges `localPlugins` with whatever the registry adds, and a
// bundled id wins), so listing them here would be a second copy of a list the
// app already has — which is exactly the duplicate that hid Function Junction
// from the launcher when it was both bundled and served.
async function registry() {
  const served = await Promise.all(
    Object.keys(proxies).map(async (prefix) => {
      try {
        const answer = await fetch(`http://127.0.0.1:${PORT}${prefix}/manifest.json`);
        return answer.ok ? await answer.json() : undefined;
      } catch {
        return undefined;
      }
    }),
  );
  return served.filter(Boolean);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  // A plugin's own backend, same-origin so `script-src 'self'` still covers
  // its remote entry.
  const prefix = prefixOf(url.pathname);
  if (prefix) {
    // Streamed with every header, both ways: a framed app sets cookies and
    // reads x-forwarded-proto, and a fetch-and-buffer relay drops both.
    const t = new URL(proxies[prefix]);
    const up = httpRequest(
      { host: t.hostname, port: t.port || 80, method: req.method, path: req.url, headers: req.headers },
      (answer) => {
        res.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(res);
      },
    );
    up.on('error', (error) => {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end(`upstream ${proxies[prefix]}: ${error.message}`);
    });
    req.pipe(up);
    return;
  }

  if (url.pathname === '/plugin-registry/plugins') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(await registry()));
    return;
  }

  // Static, then SPA fallback: the router owns every other path.
  const rel = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(DIST, rel);
  const hit = file.startsWith(DIST) && existsSync(file) && statSync(file).isFile();
  const path = hit ? file : join(DIST, 'index.html');
  res.writeHead(200, {
    'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
    'cache-control': path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(path).pipe(res);
});

const prefixOf = (pathname) => Object.keys(proxies).find((p) => pathname.startsWith(p));

// A framed app (Solara, Jupyter) opens a websocket under its own prefix; the
// upgrade is handed to the backend as raw bytes and the two sockets are tied.
server.on('upgrade', (req, socket, head) => {
  const prefix = prefixOf(new URL(req.url, `http://127.0.0.1:${PORT}`).pathname);
  if (!prefix) return socket.destroy();
  const t = new URL(proxies[prefix]);
  const up = netConnect(Number(t.port) || 80, t.hostname, () => {
    let raw = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    up.write(raw + '\r\n');
    if (head.length) up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(PORT, () => {
  console.log(`serving dist on http://127.0.0.1:${PORT}`);
  console.log('proxying', Object.entries(proxies).map(([p, o]) => `${p} → ${o}`).join(', ') || '(nothing)');
});
