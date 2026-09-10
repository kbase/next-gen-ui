import { describe, expect, it, vi } from 'vitest';
import { SDK_VERSION } from '../../plugins/sdk';
import type { Manifest } from '../../plugins/sdk';
import { localPlugins } from '../../plugins/local';
import { fetchRegistry, mergeInstalled, remotePlugin } from './registry';

const loadRemote = vi.fn();
const registerRemotes = vi.fn();
vi.mock('@module-federation/runtime', () => ({
  registerRemotes: (...args: unknown[]) => registerRemotes(...args),
  loadRemote: (...args: unknown[]) => loadRemote(...args),
}));

const ok = (body: unknown) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  ) as unknown as typeof fetch;

const remote: Manifest = {
  id: 'commons',
  title: 'Commons',
  sdkVersion: SDK_VERSION,
  modules: ['route', 'background'],
};

describe('fetchRegistry', () => {
  it('parses manifests and drops invalid ones', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const list = await fetchRegistry('/plugin-registry', ok([remote, { id: 'Bad Id' }]));
    expect(list.map((m) => m.id)).toEqual(['commons']);
  });

  it('rejects a failing or non-list answer', async () => {
    const failing = vi.fn(async () => new Response('', { status: 502 })) as unknown as typeof fetch;
    await expect(fetchRegistry('/plugin-registry', failing)).rejects.toThrow(/502/);
    await expect(fetchRegistry('/plugin-registry', ok({}))).rejects.toThrow(/list/);
  });

  // The built image answers every unknown path with the shell's own page.
  it('treats an HTML answer as no registry at all', async () => {
    const page = vi.fn(
      async () =>
        new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    ) as unknown as typeof fetch;
    await expect(fetchRegistry('/plugin-registry', page)).rejects.toThrow(/nothing answers/);
  });
});

describe('mergeInstalled', () => {
  it('keeps bundled plugins over same-id registry entries and adds the rest', () => {
    const merged = mergeInstalled(localPlugins, [{ ...remote, id: 'jobs' }, remote]);
    expect(merged.map((p) => p.manifest.id)).toEqual([
      ...localPlugins.map((p) => p.manifest.id),
      'commons',
    ]);
    expect(merged.find((p) => p.manifest.id === 'jobs')).toBe(
      localPlugins.find((p) => p.manifest.id === 'jobs'),
    );
  });
});

describe('remotePlugin', () => {
  it('finds the bundle at the conventional path and loads one module at a time', async () => {
    loadRemote.mockReset();
    registerRemotes.mockReset();
    const route = { mount: () => {}, normalize: (p: string) => p };
    loadRemote.mockImplementation(async (name: string) => {
      if (name === 'commons/route') return { default: route };
      throw new Error(`unexpected load of ${name}`);
    });
    const plugin = remotePlugin(remote);
    expect(Object.keys(plugin.modules)).toEqual(['route', 'background']);
    await expect(plugin.modules.route!()).resolves.toBe(route);
    expect(registerRemotes).toHaveBeenCalledWith(
      [{ name: 'commons', entry: '/services/commons/plugin/remoteEntry.js', type: 'module' }],
      { force: false },
    );
    expect(loadRemote).toHaveBeenCalledTimes(1);
  });
});
