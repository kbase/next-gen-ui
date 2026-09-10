import { loadRemote, registerRemotes } from '@module-federation/runtime';
import type { Manifest, Module, Modules } from '../../plugins/sdk';
import { ManifestSchema } from '../../plugins/sdk';
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

export async function fetchRegistry(
  base: string = REGISTRY_BASE,
  fetchImpl: typeof fetch = fetch,
): Promise<Manifest[]> {
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
  for (const item of raw) {
    const parsed = ManifestSchema.safeParse(item);
    if (parsed.success) manifests.push(parsed.data);
    else console.warn('plugin registry: skipping an invalid manifest', item, parsed.error.issues);
  }
  return manifests;
}

// A registry manifest becomes an installed plugin whose modules arrive over
// Module Federation, each on first use. Registered once per id, and
// re-registered only if the entry URL changes: `registerRemotes` warns when
// asked to override a remote it already has.
const registered = new Map<string, string>();

export function remotePlugin(manifest: Manifest, base: string = SERVICES_BASE): InstalledPlugin {
  const entry = `${base}/${manifest.id}/plugin/remoteEntry.js`;
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

// What main.tsx calls: the bundled list plus whatever the registry adds. A
// registry that is down or absent leaves the bundled plugins working.
export async function loadInstalled(local: InstalledPlugin[]): Promise<InstalledPlugin[]> {
  try {
    return mergeInstalled(local, await fetchRegistry());
  } catch (err) {
    console.warn('plugin registry unavailable; using bundled plugins only', err);
    return local;
  }
}
