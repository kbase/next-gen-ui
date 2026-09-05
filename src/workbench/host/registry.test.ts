import { describe, expect, it, vi } from 'vitest';
import { CONTRACT_VERSION } from '../../plugins/sdk';
import type { Manifest } from '../../plugins/sdk';
import { localPlugins } from '../../plugins/local';
import { fetchRegistry, mergeInstalled } from './registry';

const ok = (body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

const remote: Manifest = {
  id: 'commons',
  title: 'Commons',
  contractVersion: CONTRACT_VERSION,
  navigator: {},
  entry: { url: 'commons/remoteEntry.js', module: './plugin' },
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
});

describe('mergeInstalled', () => {
  it('keeps bundled plugins over same-id registry entries and adds the rest', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const merged = mergeInstalled(localPlugins, [
      { ...remote, id: 'jobs' },
      remote,
      { id: 'no-code', title: 'x', contractVersion: CONTRACT_VERSION },
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
