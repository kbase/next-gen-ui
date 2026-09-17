import { describe, expect, it, vi } from 'vitest';
import { SDK_VERSION } from '@kbase/plugin-sdk';
import type { Manifest } from '@kbase/plugin-sdk';
import { localPlugins } from '../../../plugins/local';
import {
  fetchRegistry,
  loadInstalled,
  mergeInstalled,
  pluginFromManifestUrl,
  remotePlugin,
} from './registry';

const loadRemote = vi.fn();
const registerRemotes = vi.fn();
vi.mock('@module-federation/runtime', () => ({
  registerRemotes: (...args: unknown[]) => registerRemotes(...args),
  loadRemote: (...args: unknown[]) => loadRemote(...args),
}));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// A fetch that answers each URL from a table; a URL not in it fails the way
// a server that is down or refuses the origin does.
const serving = (answers: Record<string, () => Response>) =>
  vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const answer = answers[url] ?? answers[new URL(url).pathname];
    if (!answer) throw new TypeError('Failed to fetch');
    return answer();
  }) as unknown as typeof fetch;

// The build's manifest: the federation manifest with the plugin's fields on
// top. The runtime's keys are whatever they are; the host reads its own.
const remote: Manifest = {
  id: 'commons',
  name: 'commons',
  metaData: { remoteEntry: { name: 'remoteEntry-abc123.js', type: 'module' }, publicPath: 'auto' },
  exposes: [],
  shared: [],
  title: 'Commons',
  sdkVersion: SDK_VERSION,
  modules: ['route', 'background'],
};
const url = 'http://plugins.test:8899/manifest.json';

describe('pluginFromManifestUrl', () => {
  it('installs the plugin and hands the runtime the manifest URL as the entry', async () => {
    registerRemotes.mockReset();
    loadRemote.mockReset();
    loadRemote.mockResolvedValue({ default: { mount: () => {}, normalize: (p: string) => p } });
    const fetchImpl = serving({ [url]: () => json(remote) });

    const plugin = await pluginFromManifestUrl(url, fetchImpl);

    expect(plugin.manifest.id).toBe('commons');
    expect(plugin.manifest.metaData).toEqual(remote.metaData);
    expect(fetchImpl).toHaveBeenCalledWith(url, { cache: 'no-cache' });
    await plugin.modules.route!();
    await plugin.modules.background!();
    expect(registerRemotes).toHaveBeenCalledTimes(1);
    expect(registerRemotes).toHaveBeenCalledWith([{ name: 'commons', entry: url }], {
      force: false,
    });
  });

  it('resolves a relative URL against the page', async () => {
    const fetchImpl = serving({ '/services/commons/manifest.json': () => json(remote) });
    const plugin = await pluginFromManifestUrl('/services/commons/manifest.json', fetchImpl);
    expect(plugin.manifest.id).toBe('commons');
    expect(fetchImpl).toHaveBeenCalledWith(`${location.origin}/services/commons/manifest.json`, {
      cache: 'no-cache',
    });
  });

  it('replaces what the runtime holds when the same id is installed again', async () => {
    registerRemotes.mockReset();
    loadRemote.mockResolvedValue({ default: { mount: () => {}, normalize: (p: string) => p } });
    const again = await pluginFromManifestUrl(url, serving({ [url]: () => json(remote) }));
    await again.modules.route!();
    expect(registerRemotes).toHaveBeenLastCalledWith([{ name: 'commons', entry: url }], {
      force: true,
    });
  });

  it('says the server must allow this origin when the fetch itself fails', async () => {
    await expect(pluginFromManifestUrl(url, serving({}))).rejects.toThrow(
      `could not fetch ${url}; the server must allow cross-origin requests from ${location.origin}`,
    );
  });

  it('names the status, the JSON and the schema failure, and carries the decline', async () => {
    await expect(
      pluginFromManifestUrl(url, serving({ [url]: () => new Response('', { status: 404 }) })),
    ).rejects.toThrow('answered 404');
    await expect(
      pluginFromManifestUrl(url, serving({ [url]: () => new Response('<!doctype html>') })),
    ).rejects.toThrow('is not JSON');
    const stale = pluginFromManifestUrl(
      url,
      serving({ [url]: () => json({ ...remote, sdkVersion: '0.1.0' }) }),
    );
    await expect(stale).rejects.toThrow(SDK_VERSION);
    await expect(stale).rejects.toMatchObject({
      decline: { id: 'commons', url, sdkVersion: '0.1.0', reason: expect.stringContaining(url) },
    });
  });
});

describe('fetchRegistry', () => {
  it('installs each listed URL and declines the ones it cannot, in order', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { installed, declined } = await fetchRegistry(
      '/plugin-registry',
      serving({
        '/plugin-registry/plugins': () =>
          json([
            '/services/commons/manifest.json',
            '/services/down/manifest.json',
            '/services/old/manifest.json',
          ]),
        '/services/commons/manifest.json': () => json(remote),
        '/services/old/manifest.json': () => json({ ...remote, id: 'old', sdkVersion: '0.1.0' }),
      }),
    );
    expect(installed.map((p) => p.manifest.id)).toEqual(['commons']);
    expect(declined).toEqual([
      {
        id: '/services/down/manifest.json',
        url: '/services/down/manifest.json',
        reason: expect.stringContaining('could not fetch'),
      },
      {
        id: 'old',
        url: '/services/old/manifest.json',
        sdkVersion: '0.1.0',
        reason: expect.stringContaining(SDK_VERSION),
      },
    ]);
  });

  it('rejects a failing answer or one that is not a list of URLs', async () => {
    await expect(
      fetchRegistry(
        '/plugin-registry',
        serving({ '/plugin-registry/plugins': () => json('', 502) }),
      ),
    ).rejects.toThrow(/502/);
    await expect(
      fetchRegistry(
        '/plugin-registry',
        serving({ '/plugin-registry/plugins': () => json([remote]) }),
      ),
    ).rejects.toThrow(/list of manifest URLs/);
  });

  // The built image answers every unknown path with the shell's own page.
  it('treats an HTML answer as no registry at all', async () => {
    const page = serving({ '/plugin-registry/plugins': () => new Response('<!doctype html>') });
    await expect(fetchRegistry('/plugin-registry', page)).rejects.toThrow(/nothing answers/);
  });
});

describe('loadInstalled', () => {
  it('installs the saved URLs beside the registry, and declines one whose server is down', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { installed, declined } = await loadInstalled(
      localPlugins,
      [url, 'http://plugins.test/down/manifest.json'],
      serving({
        '/plugin-registry/plugins': () => json(['/services/other/manifest.json']),
        '/services/other/manifest.json': () => json({ ...remote, id: 'other' }),
        [url]: () => json(remote),
      }),
    );
    const ids = installed.map((p) => p.manifest.id);
    expect(ids.slice(-2)).toEqual(['other', 'commons']);
    expect(installed.find((p) => p.manifest.id === 'commons')?.origin).toEqual({ url });
    expect(installed.find((p) => p.manifest.id === 'other')?.origin).toBeUndefined();
    expect(declined).toEqual([
      {
        id: 'http://plugins.test/down/manifest.json',
        url: 'http://plugins.test/down/manifest.json',
        reason: expect.stringContaining('could not fetch'),
        saved: true,
      },
    ]);
  });

  it('declines a saved URL whose id a registry plugin already holds', async () => {
    const { installed, declined } = await loadInstalled(
      localPlugins,
      [url],
      serving({
        '/plugin-registry/plugins': () => json(['/services/commons/manifest.json']),
        '/services/commons/manifest.json': () => json(remote),
        [url]: () => json(remote),
      }),
    );
    expect(installed.filter((p) => p.manifest.id === 'commons')).toHaveLength(1);
    expect(installed.find((p) => p.manifest.id === 'commons')?.origin).toBeUndefined();
    expect(declined).toEqual([
      { id: 'commons', url, reason: 'plugin commons is already installed', saved: true },
    ]);
  });

  it('still installs the saved URLs when the registry is down', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { installed, declined } = await loadInstalled(
      localPlugins,
      [url],
      serving({ [url]: () => json(remote) }),
    );
    expect(installed.at(-1)?.manifest.id).toBe('commons');
    expect(declined).toEqual([]);
  });
});

describe('mergeInstalled', () => {
  it('keeps bundled plugins over same-id registry entries and adds the rest', () => {
    const merged = mergeInstalled(localPlugins, [
      remotePlugin({ ...remote, id: 'jobs' }, url),
      remotePlugin(remote, url),
    ]);
    expect(merged.map((p) => p.manifest.id)).toEqual([
      ...localPlugins.map((p) => p.manifest.id),
      'commons',
    ]);
    expect(merged.find((p) => p.manifest.id === 'jobs')).toBe(
      localPlugins.find((p) => p.manifest.id === 'jobs'),
    );
  });
});
