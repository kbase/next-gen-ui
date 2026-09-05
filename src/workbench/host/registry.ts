import { loadRemote, registerRemotes } from '@module-federation/runtime';
import type { Manifest, Matcher, PluginModule } from '../../plugins/sdk';
import { ManifestSchema } from '../../plugins/sdk';
import type { InstalledPlugin } from './installed';

// The registry: GET <base>/plugins → Manifest[]. Same origin, so a remote
// entry it names is covered by `script-src 'self'`; in the container nginx
// proxies the path, in dev a Vite middleware serves the local manifests.
export const REGISTRY_BASE = '/plugin-registry';

export async function fetchRegistry(
  base: string = REGISTRY_BASE,
  fetchImpl: typeof fetch = fetch,
): Promise<Manifest[]> {
  const res = await fetchImpl(`${base}/plugins`);
  if (!res.ok) throw new Error(`plugin registry answered ${res.status}`);
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

// A registry manifest becomes an installed plugin whose code arrives over
// Module Federation on first use. Registration is idempotent per id.
const registered = new Set<string>();

export function remotePlugin(manifest: Manifest, base: string = REGISTRY_BASE): InstalledPlugin {
  const entry = manifest.entry;
  if (!entry) throw new Error(`manifest ${manifest.id} has no entry`);
  const url =
    entry.url.startsWith('/') || /^https?:/.test(entry.url) ? entry.url : `${base}/${entry.url}`;

  const register = () => {
    registerRemotes([{ name: manifest.id, entry: url }], { force: registered.has(manifest.id) });
    registered.add(manifest.id);
  };
  const exposed = (name: string) => `${manifest.id}/${name.replace(/^\.\//, '')}`;

  return {
    manifest,
    load: async () => {
      register();
      const mod = await loadRemote<{ default?: PluginModule } | PluginModule>(
        exposed(entry.module),
      );
      const module =
        mod && 'default' in mod && mod.default ? mod.default : (mod as PluginModule | null);
      if (!module) throw new Error(`plugin ${manifest.id} exposed nothing at ${entry.module}`);
      return module;
    },
    // Declared separately from the UI module so it can be fetched on its own:
    // a matcher runs on every keystroke and must not wait for a panel bundle.
    // Nothing here is lazy — the host calls this at startup.
    loadMatch: entry.matcher
      ? async () => {
          register();
          const mod = await loadRemote<{ default?: Matcher } | Matcher>(exposed(entry.matcher!));
          const match =
            typeof mod === 'function' ? mod : mod && 'default' in mod ? mod.default : undefined;
          if (typeof match !== 'function') {
            throw new Error(`plugin ${manifest.id} exposed no matcher at ${entry.matcher}`);
          }
          return match;
        }
      : undefined,
  };
}

// Bundled plugins win over registry entries with the same id; a registry
// manifest without an entry has no code to load and is skipped.
export function mergeInstalled(
  local: InstalledPlugin[],
  remote: Manifest[],
  base?: string,
): InstalledPlugin[] {
  const ids = new Set(local.map((p) => p.manifest.id));
  const extra: InstalledPlugin[] = [];
  for (const manifest of remote) {
    if (ids.has(manifest.id)) continue;
    if (!manifest.entry) {
      console.warn(`plugin registry: ${manifest.id} has no entry and is not bundled; skipped`);
      continue;
    }
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
