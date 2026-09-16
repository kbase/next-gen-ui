import { loadRemote, registerRemotes } from '@module-federation/runtime';
import type { z } from 'zod';
import type { Manifest, Module, Modules } from '@kbase/plugin-sdk';
import { ManifestSchema } from '@kbase/plugin-sdk';
import type { InstalledPlugin, ModuleLoaders } from './installed';

// The registry: GET <base>/plugins → Manifest[]. Same origin, so a remote
// entry it names is covered by `script-src 'self'`. In dev a Vite middleware
// answers it from the proxied services; the built image serves nothing here,
// so a deployment either fronts the path or runs the bundled plugins alone.
export const REGISTRY_BASE = '/plugin-registry';

// Where a plugin's service is mounted. The manifest does not say where the
// code is: the service serves its manifest at <base>/<id>/manifest.json and
// its bundle under <base>/<id>/plugin/, and the host derives both from the
// id.
export const SERVICES_BASE = '/services';

// A registry entry the workbench did not load, and why: what Settings lists
// beside the plugins that are installed, so a reader who cannot find a plugin
// sees that it was declined rather than nothing at all.
export interface DeclinedPlugin {
  id: string;
  // The SDK the manifest declared, when that is the reason.
  sdkVersion?: string;
  reason: string;
}

export interface RegistryReport {
  manifests: Manifest[];
  declined: DeclinedPlugin[];
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
  if (!Array.isArray(raw)) throw new Error('plugin registry did not return a list');
  const manifests: Manifest[] = [];
  const declined: DeclinedPlugin[] = [];
  for (const item of raw) {
    const parsed = ManifestSchema.safeParse(item);
    if (parsed.success) {
      manifests.push(parsed.data);
      continue;
    }
    const decline = describeDecline(item, parsed.error.issues);
    declined.push(decline);
    if (decline.sdkVersion) {
      console.warn(
        `plugin registry: not loading ${decline.id}, built against SDK ${decline.sdkVersion}: ${decline.reason}`,
      );
    } else {
      console.warn('plugin registry: skipping an invalid manifest', item, parsed.error.issues);
    }
  }
  return { manifests, declined };
}

// A manifest that is sound apart from the SDK it names is a plugin whose
// author has to rebuild it, so that one gets a sentence naming the plugin,
// the SDK it declared and the rule, in place of a pile of issues.
export function describeDecline(item: unknown, issues: z.ZodError['issues']): DeclinedPlugin {
  const entry = item as { id?: unknown; sdkVersion?: unknown };
  const id = typeof entry.id === 'string' ? entry.id : String(entry.id);
  if (
    issues.length === 1 &&
    issues[0].path[0] === 'sdkVersion' &&
    typeof entry.sdkVersion === 'string'
  ) {
    return { id, sdkVersion: entry.sdkVersion, reason: issues[0].message };
  }
  return {
    id,
    reason: issues
      .map((i) => `${i.path.map(String).join('.') || 'manifest'}: ${i.message}`)
      .join('; '),
  };
}

// One plugin from the URL of its manifest, `<base>/<id>/manifest.json`, with
// its bundle expected under `<base>/<id>/plugin/` the way a registry plugin's
// is. Every failure is a sentence for the person who typed the URL. The entry
// carries a version query so that installing the same URL again, after a
// rebuild, is a new entry URL: the federation runtime re-registers it and the
// browser does not answer from its module map.
export async function fromManifestUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<InstalledPlugin> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`${url} is not a URL`);
  }
  const segments = parsedUrl.pathname.split('/');
  if (segments.length < 3 || segments.at(-1) !== 'manifest.json') {
    throw new Error(
      `the workbench expects a manifest at <base>/<id>/manifest.json; ${url} does not end that way`,
    );
  }
  let res: Response;
  try {
    res = await fetchImpl(url);
  } catch {
    const origin = typeof location === 'undefined' ? 'the workbench' : location.origin;
    throw new Error(
      `could not fetch ${url}; the server must allow cross-origin requests from ${origin}`,
    );
  }
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new Error(`${url} is not JSON`);
  }
  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${url}: ${describeDecline(raw, parsed.error.issues).reason}`);
  }
  const manifest = parsed.data;
  if (segments.at(-2) !== manifest.id) {
    throw new Error(
      `the manifest at ${url} declares id ${manifest.id}; the workbench expects it at …/${manifest.id}/manifest.json`,
    );
  }
  const base = parsedUrl.origin + segments.slice(0, -2).join('/');
  return { ...remotePlugin(manifest, base, String(Date.now())), origin: { url } };
}

// A registry manifest becomes an installed plugin whose modules arrive over
// Module Federation, each on first use. Registered once per id, and
// re-registered only if the entry URL changes: `registerRemotes` warns when
// asked to override a remote it already has.
const registered = new Map<string, string>();

export function remotePlugin(
  manifest: Manifest,
  base: string = SERVICES_BASE,
  version?: string,
): InstalledPlugin {
  const entry = `${base}/${manifest.id}/plugin/remoteEntry.js${version ? `?v=${version}` : ''}`;
  const register = () => {
    const already = registered.get(manifest.id);
    if (already === entry) return;
    // A Vite federation build is an ES module; without saying so the runtime
    // would load the entry as a classic script.
    registerRemotes([{ name: manifest.id, entry, type: 'module' }], {
      force: already !== undefined,
    });
    registered.set(manifest.id, entry);
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
  remote: Manifest[],
  base?: string,
): InstalledPlugin[] {
  const ids = new Set(local.map((p) => p.manifest.id));
  const extra: InstalledPlugin[] = [];
  for (const manifest of remote) {
    if (ids.has(manifest.id)) continue;
    ids.add(manifest.id);
    extra.push(remotePlugin(manifest, base));
  }
  return [...local, ...extra];
}

// What main.tsx calls: the bundled list plus whatever the registry adds, and
// what the registry listed that was not loaded. A registry that is down or
// absent leaves the bundled plugins working.
export async function loadInstalled(
  local: InstalledPlugin[],
): Promise<{ installed: InstalledPlugin[]; declined: DeclinedPlugin[] }> {
  try {
    const { manifests, declined } = await fetchRegistry();
    return { installed: mergeInstalled(local, manifests), declined };
  } catch (err) {
    console.warn('plugin registry unavailable; using bundled plugins only', err);
    return { installed: local, declined: [] };
  }
}
