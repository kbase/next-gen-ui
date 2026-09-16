import { loadRemote, registerRemotes } from '@module-federation/runtime';
import type { z } from 'zod';
import type { Manifest, Module, Modules } from '@kbase/plugin-sdk';
import { ManifestSchema } from '@kbase/plugin-sdk';
import type { InstalledPlugin, ModuleLoaders } from './installed';

// The registry: GET <base>/plugins → the URLs of the manifests to install,
// absolute or relative to the workbench's origin. In dev a Vite middleware
// answers it with one URL per proxied service; the built image serves nothing
// here, so a deployment either fronts the path or runs the bundled plugins
// alone.
export const REGISTRY_BASE = '/plugin-registry';

// A plugin the workbench did not install, and why: what Settings lists
// beside the plugins that are installed, so a reader who cannot find a plugin
// sees that it was declined rather than nothing at all.
export interface DeclinedPlugin {
  // The manifest's id when it had one; otherwise the URL.
  id: string;
  // The SDK the manifest declared, when that is the reason.
  sdkVersion?: string;
  reason: string;
  // Where the manifest was asked for.
  url: string;
  // A URL this reader installed in an earlier session, kept until they
  // remove it; the registry's own entries are not.
  saved?: boolean;
}

export interface RegistryReport {
  installed: InstalledPlugin[];
  declined: DeclinedPlugin[];
}

// Why a manifest URL did not become a plugin, in one sentence for the person
// who typed it, and as a `DeclinedPlugin` for the list Settings draws.
export class ManifestUrlError extends Error {
  constructor(readonly decline: DeclinedPlugin) {
    super(decline.reason);
    this.name = 'ManifestUrlError';
  }
}

export async function fetchRegistry(
  base: string = REGISTRY_BASE,
  fetchImpl: typeof fetch = fetch,
): Promise<RegistryReport> {
  const res = await fetchImpl(`${base}/plugins`);
  if (!res.ok) throw new Error(`plugin registry answered ${res.status}`);
  // The shell's own fallback page answers any path with HTML; that is a
  // deployment with no registry, not a broken one.
  if (!res.headers.get('content-type')?.includes('json')) {
    throw new Error(`nothing answers ${base}/plugins as a registry`);
  }
  const raw: unknown = await res.json();
  if (!Array.isArray(raw) || !raw.every((url) => typeof url === 'string')) {
    throw new Error('plugin registry did not return a list of manifest URLs');
  }
  const results = await Promise.all(
    raw.map(async (url: string) => {
      try {
        return { plugin: await pluginFromManifestUrl(url, fetchImpl) };
      } catch (err) {
        const decline = declineOf(url, err);
        console.warn(`plugin registry: not loading ${url}: ${decline.reason}`);
        return { decline };
      }
    }),
  );
  return {
    installed: results.flatMap((r) => (r.plugin ? [r.plugin] : [])),
    declined: results.flatMap((r) => (r.decline ? [r.decline] : [])),
  };
}

export function declineOf(url: string, err: unknown): DeclinedPlugin {
  if (err instanceof ManifestUrlError) return err.decline;
  return { id: url, url, reason: err instanceof Error ? err.message : String(err) };
}

// A manifest that is sound apart from the SDK it names is a plugin whose
// author has to rebuild it, so that one gets a sentence naming the plugin,
// the SDK it declared and the rule, in place of a pile of issues.
export function describeDecline(
  item: unknown,
  issues: z.ZodError['issues'],
  url: string,
): DeclinedPlugin {
  const entry = item as { id?: unknown; sdkVersion?: unknown };
  const id = typeof entry.id === 'string' ? entry.id : url;
  if (
    issues.length === 1 &&
    issues[0].path[0] === 'sdkVersion' &&
    typeof entry.sdkVersion === 'string'
  ) {
    return { id, url, sdkVersion: entry.sdkVersion, reason: issues[0].message };
  }
  return {
    id,
    url,
    reason: issues
      .map((i) => `${i.path.map(String).join('.') || 'manifest'}: ${i.message}`)
      .join('; '),
  };
}

// One plugin from the URL of its manifest. The file is the federation
// manifest with the plugin's fields on top, so the same URL is what the
// federation runtime is given as the remote's entry: it reads the entry
// file's name and type, the chunks of each module and the asset base from
// it. Every failure is a sentence for the person who typed the URL.
export async function pluginFromManifestUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<InstalledPlugin> {
  const fail = (reason: string) => new ManifestUrlError({ id: url, url, reason });
  let absolute: string;
  try {
    absolute = new URL(url, typeof location === 'undefined' ? undefined : location.href).href;
  } catch {
    throw fail(`${url} is not a URL`);
  }
  let res: Response;
  try {
    // Revalidated on every install: the manifest names a hashed entry, and a
    // rebuild changes the manifest at the same URL.
    res = await fetchImpl(absolute, { cache: 'no-cache' });
  } catch {
    const origin = typeof location === 'undefined' ? 'the workbench' : location.origin;
    throw fail(
      `could not fetch ${url}; the server must allow cross-origin requests from ${origin}`,
    );
  }
  if (!res.ok) throw fail(`${url} answered ${res.status}`);
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw fail(`${url} is not JSON`);
  }
  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    const decline = describeDecline(raw, parsed.error.issues, url);
    throw new ManifestUrlError({ ...decline, reason: `${url}: ${decline.reason}` });
  }
  return remotePlugin(parsed.data, absolute);
}

// The ids registered with the federation runtime in this session. A plugin
// installed again — the same URL after a rebuild, or another — replaces what
// the runtime holds: `removeRemote` drops its manifest and module caches, and
// the entry file's hashed name means the browser's module map holds nothing
// it could hand back.
const registered = new Set<string>();

export function remotePlugin(manifest: Manifest, manifestUrl: string): InstalledPlugin {
  let done = false;
  const register = () => {
    if (done) return;
    done = true;
    registerRemotes([{ name: manifest.id, entry: manifestUrl }], {
      force: registered.has(manifest.id),
    });
    registered.add(manifest.id);
  };
  const loader =
    <K extends Module>(kind: K) =>
    async (): Promise<Modules[K]> => {
      register();
      const mod = await loadRemote<{ default?: Modules[K] } | null>(`${manifest.id}/${kind}`);
      const value = mod && 'default' in mod ? mod.default : undefined;
      if (!value) throw new Error(`plugin ${manifest.id} exposed nothing at ./${kind}`);
      return value;
    };
  const modules: ModuleLoaders = {};
  for (const kind of manifest.modules) {
    (modules as Record<Module, () => Promise<unknown>>)[kind] = loader(kind);
  }
  return { manifest, modules };
}

// Bundled plugins win over registry entries with the same id, which is what
// stops a registry from replacing first-party code.
export function mergeInstalled(
  local: InstalledPlugin[],
  remote: InstalledPlugin[],
): InstalledPlugin[] {
  const ids = new Set(local.map((p) => p.manifest.id));
  const extra: InstalledPlugin[] = [];
  for (const plugin of remote) {
    if (ids.has(plugin.manifest.id)) continue;
    ids.add(plugin.manifest.id);
    extra.push(plugin);
  }
  return [...local, ...extra];
}

// What main.tsx calls: the bundled list plus whatever the registry adds, and
// what the registry listed that was not installed. A registry that is down or
// absent leaves the bundled plugins working.
export async function loadInstalled(
  local: InstalledPlugin[],
): Promise<{ installed: InstalledPlugin[]; declined: DeclinedPlugin[] }> {
  try {
    const { installed, declined } = await fetchRegistry();
    return { installed: mergeInstalled(local, installed), declined };
  } catch (err) {
    console.warn('plugin registry unavailable; using bundled plugins only', err);
    return { installed: local, declined: [] };
  }
}
