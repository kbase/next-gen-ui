import { describe, expect, it, vi } from 'vitest';
import { SDK_VERSION } from '@kbase/plugin-sdk';
import type { Manifest } from '@kbase/plugin-sdk';
import { localPlugins } from '../../../plugins/local';
import { fetchRegistry, fromManifestUrl, mergeInstalled, remotePlugin } from './registry';

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
    const { manifests, declined } = await fetchRegistry(
      '/plugin-registry',
      ok([remote, { id: 'Bad Id' }]),
    );
    expect(manifests.map((m) => m.id)).toEqual(['commons']);
    expect(declined.map((d) => d.id)).toEqual(['Bad Id']);
  });

  it('names the plugin, its SDK and the rule when the version is the reason', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warn.mockClear();
    const { manifests, declined } = await fetchRegistry(
      '/plugin-registry',
      ok([{ ...remote, id: 'function-junction', sdkVersion: '0.1.0' }]),
    );
    expect(manifests).toEqual([]);
    // What Settings lists: the id, the SDK it declared, and the rule.
    expect(declined).toEqual([
      {
        id: 'function-junction',
        sdkVersion: '0.1.0',
        reason: expect.stringContaining(SDK_VERSION),
      },
    ]);
    const message = warn.mock.calls[0].join(' ');
    expect(message).toContain('function-junction');
    expect(message).toContain('0.1.0');
    expect(message).toContain(SDK_VERSION);
    warn.mockRestore();
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

describe('fromManifestUrl', () => {
  const url = 'http://plugins.test:8899/services/commons/manifest.json';

  it('installs the plugin from beside its manifest, with a versioned entry', async () => {
    registerRemotes.mockReset();
    loadRemote.mockReset();
    loadRemote.mockResolvedValue({ default: { mount: () => {}, normalize: (p: string) => p } });
    const plugin = await fromManifestUrl(url, ok(remote));
    expect(plugin.manifest.id).toBe('commons');
    expect(plugin.origin).toEqual({ url });
    await plugin.modules.route!();
    const [[remotes]] = registerRemotes.mock.calls as [[{ entry: string }[]]];
    expect(remotes[0].entry).toMatch(
      /^http:\/\/plugins\.test:8899\/services\/commons\/plugin\/remoteEntry\.js\?v=\d+$/,
    );
  });

  it('says the server must allow this origin when the fetch itself fails', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(fromManifestUrl(url, down)).rejects.toThrow(
      `could not fetch ${url}; the server must allow cross-origin requests from ${location.origin}`,
    );
  });

  it('names the status, the JSON and the schema failure', async () => {
    const gone = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(fromManifestUrl(url, gone)).rejects.toThrow('answered 404');
    const html = vi.fn(async () => new Response('<!doctype html>')) as unknown as typeof fetch;
    await expect(fromManifestUrl(url, html)).rejects.toThrow('is not JSON');
    await expect(fromManifestUrl(url, ok({ ...remote, sdkVersion: '0.1.0' }))).rejects.toThrow(
      SDK_VERSION,
    );
  });

  it('refuses a manifest whose id is not the directory it was fetched from', async () => {
    await expect(fromManifestUrl(url, ok({ ...remote, id: 'other' }))).rejects.toThrow(
      'declares id other; the workbench expects it at …/other/manifest.json',
    );
  });

  it('refuses a URL that does not end in <id>/manifest.json', async () => {
    await expect(fromManifestUrl('http://plugins.test/manifest.json', ok(remote))).rejects.toThrow(
      'does not end that way',
    );
    await expect(fromManifestUrl('not a url', ok(remote))).rejects.toThrow('is not a URL');
  });
});
