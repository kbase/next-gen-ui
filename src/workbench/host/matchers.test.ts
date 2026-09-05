import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTRACT_VERSION } from '../../plugins/sdk';
import type { Manifest, Matcher, PluginModule } from '../../plugins/sdk';
import { createHostIndex } from './installed';
import type { InstalledPlugin } from './installed';

// A remote's matcher arrives over the wire, so the bar has to work before it
// lands, after it lands, and when it never does.

const loadRemote = vi.fn();
vi.mock('@module-federation/runtime', () => ({
  registerRemotes: vi.fn(),
  loadRemote: (...args: unknown[]) => loadRemote(...args),
}));

const manifest = (id: string, matcher?: string): Manifest => ({
  id,
  title: id,
  contractVersion: CONTRACT_VERSION,
  document: { route: '/' },
  entry: { url: `${id}/remoteEntry.js`, module: './plugin', matcher },
});

const never = () => Promise.reject(new Error('the UI module must not be loaded for matching'));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  loadRemote.mockReset();
});

describe('a remote plugin’s matcher', () => {
  it('is offered once it loads, and the index reports a new version', async () => {
    const match: Matcher = (text) =>
      text === 'P0AEX9' ? [{ label: `Dossier for ${text}`, action: { q: text } }] : [];
    const plugin: InstalledPlugin = {
      manifest: manifest('fj', './match'),
      load: never,
      loadMatch: async () => match,
    };

    const index = createHostIndex([plugin]);
    // Before it lands the plugin simply makes no offers; the bar still works.
    expect(index.offers('P0AEX9')).toEqual([]);
    const before = index.version();

    await settle();
    expect(index.version()).toBeGreaterThan(before);
    expect(index.offers('P0AEX9')).toEqual([
      { plugin: 'fj', title: 'fj', offer: { label: 'Dossier for P0AEX9', action: { q: 'P0AEX9' } } },
    ]);
  });

  it('notifies subscribers, so an open prompt bar re-renders', async () => {
    const listener = vi.fn();
    const index = createHostIndex([
      { manifest: manifest('fj', './match'), load: never, loadMatch: async () => () => [] },
    ]);
    index.subscribe(listener);
    await settle();
    expect(listener).toHaveBeenCalled();
  });

  it('is ignored when it fails to load, leaving other plugins matching', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const index = createHostIndex([
      {
        manifest: manifest('broken', './match'),
        load: never,
        loadMatch: () => Promise.reject(new Error('404')),
      },
      {
        manifest: manifest('fine'),
        load: never,
        match: () => [{ label: 'still here', action: {} }],
      },
    ]);

    await settle();
    expect(warn).toHaveBeenCalled();
    expect(index.offers('anything').map((o) => o.plugin)).toEqual(['fine']);
  });

  // Whether a remote has one is `remotePlugin`'s reading of the manifest; the
  // index only asks a plugin that offered a way to fetch.
  it('is not fetched for a plugin that already has one', async () => {
    const loadMatch = vi.fn();
    createHostIndex([
      { manifest: manifest('local'), load: never, match: () => [], loadMatch },
    ]);
    await settle();
    expect(loadMatch).not.toHaveBeenCalled();
  });
});

describe('remotePlugin', () => {
  it('loads the matcher module by itself, without the UI module', async () => {
    const { remotePlugin } = await import('./registry');
    const match: Matcher = () => [{ label: 'hit', action: {} }];
    loadRemote.mockImplementation(async (name: string) => {
      if (name === 'fj/match') return { default: match };
      throw new Error(`unexpected load of ${name}`);
    });

    const plugin = remotePlugin(manifest('fj', './match'));
    expect(await plugin.loadMatch?.()).toBe(match);
    expect(loadRemote).toHaveBeenCalledExactlyOnceWith('fj/match');
  });

  it('has no loadMatch when the manifest names no matcher', async () => {
    const { remotePlugin } = await import('./registry');
    expect(remotePlugin(manifest('fj')).loadMatch).toBeUndefined();
  });

  it('rejects when the named module exports no function', async () => {
    const { remotePlugin } = await import('./registry');
    loadRemote.mockResolvedValue({ default: { notAFunction: true } });
    await expect(remotePlugin(manifest('fj', './match')).loadMatch?.()).rejects.toThrow(
      /exposed no matcher/,
    );
  });

  it('accepts a module that is the function itself', async () => {
    const { remotePlugin } = await import('./registry');
    const match: Matcher = () => [];
    loadRemote.mockResolvedValue(match);
    expect(await remotePlugin(manifest('fj', './match')).loadMatch?.()).toBe(match);
  });
});

// The UI module still loads lazily; adding a matcher must not change that.
describe('the UI module', () => {
  it('is not loaded by matching', async () => {
    const load = vi.fn(async () => ({}) as PluginModule);
    const index = createHostIndex([
      { manifest: manifest('fj', './match'), load, loadMatch: async () => () => [] },
    ]);
    await settle();
    index.offers('P0AEX9');
    expect(load).not.toHaveBeenCalled();
  });
});
