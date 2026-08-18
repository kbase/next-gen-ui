import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

// `id` is both the Module Federation remote name and the URL segment the
// plugin mounts at.
const PluginEntry = z.object({
  id: z.string(),
  manifestUrl: z.string(),
});
export type PluginEntry = z.infer<typeof PluginEntry>;

// The registry endpoint is stubbed via MSW in dev and test.
const REGISTRY_URL = import.meta.env.VITE_PLUGIN_REGISTRY_URL ?? '/plugin-registry';

async function fetchPlugins(): Promise<PluginEntry[]> {
  const res = await fetch(`${REGISTRY_URL}/plugins`);
  if (!res.ok) throw new Error(`Plugin registry request failed: ${res.status}`);
  return z.array(PluginEntry).parse(await res.json());
}

export function pluginsOptions() {
  return queryOptions({ queryKey: ['plugins'], queryFn: fetchPlugins });
}
