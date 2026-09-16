import { describe, expect, it, vi } from 'vitest';
import type { Background, Intent, PluginHost } from '@kbase/plugin-sdk';
import { definePluginManifest } from '@kbase/plugin-sdk';
import { createCommandRegistry } from '../../commands';
import { createHostIndex } from './installed';
import { localPlugin } from './local';

const host = (() => ({})) as unknown as (plugin: string) => PluginHost;

const ranker = (index = vi.fn()) => ({
  index,
  plugin: localPlugin({
    config: definePluginManifest({ id: 'ranker', title: 'Ranker' }),
    intent: () => Promise.resolve<Intent>({ index, suggest: () => [] }),
  }),
});

const hello = (background?: Background) =>
  localPlugin({
    config: definePluginManifest({
      id: 'hello',
      title: 'Hello',
      commands: [{ name: 'hello', title: 'Say hello' }],
    }),
    commands: () => Promise.resolve({ hello: () => {} }),
    ...(background ? { background: () => Promise.resolve(background) } : {}),
  });

describe('adding a plugin to the index', () => {
  it('lists it, registers its commands and fetches its background', async () => {
    const registry = createCommandRegistry();
    const source = createHostIndex([]);
    source.registerCommands(registry, host);
    const terms = vi.fn(() => []);
    const listener = vi.fn();
    source.subscribe(listener);

    source.add(hello({ terms }));

    expect(source.plugins().map((p) => p.id)).toEqual(['hello']);
    expect(registry.get('hello:hello')?.title).toBe('Say hello');
    expect(listener).toHaveBeenCalled();
    await vi.waitFor(() => expect(source.backgrounds().map((b) => b.plugin)).toEqual(['hello']));
  });

  it('hands every loaded intent the grown catalog', async () => {
    const { index, plugin } = ranker();
    const source = createHostIndex([plugin]);
    await vi.waitFor(() => expect(index).toHaveBeenCalledTimes(1));

    source.add(hello());

    expect(index).toHaveBeenCalledTimes(2);
    const [commands] = index.mock.calls[1] as [{ name: string; plugin: string }[]];
    expect(commands).toEqual([expect.objectContaining({ name: 'hello', plugin: 'hello' })]);
  });

  it('refuses an id that is taken', () => {
    const source = createHostIndex([hello()]);
    expect(() => source.add(hello())).toThrow('plugin hello is already installed');
  });
});

describe('removing a plugin from the index', () => {
  it('unregisters its commands, drops its modules and shrinks the catalog', async () => {
    const registry = createCommandRegistry();
    const { index, plugin } = ranker();
    const source = createHostIndex([plugin, hello()]);
    source.registerCommands(registry, host);
    await source.module('hello', 'commands');
    await vi.waitFor(() => expect(index).toHaveBeenCalledTimes(1));

    source.remove('hello');

    expect(source.plugins().map((p) => p.id)).toEqual(['ranker']);
    expect(registry.get('hello:hello')).toBeUndefined();
    expect(source.anyLoaded('hello')).toBe(false);
    expect(index).toHaveBeenCalledTimes(2);
    expect((index.mock.calls[1] as [unknown[]])[0]).toEqual([]);
    await expect(source.module('hello', 'commands')).rejects.toThrow('not installed');
  });

  it('keeps nothing from a load that lands after the removal', async () => {
    let resolve: (b: Background) => void = () => {};
    const slow = localPlugin({
      config: definePluginManifest({ id: 'slow', title: 'Slow' }),
      background: () => new Promise<Background>((r) => (resolve = r)),
    });
    const source = createHostIndex([slow]);

    source.remove('slow');
    resolve({ terms: () => [] });
    await Promise.resolve();
    await Promise.resolve();

    expect(source.anyLoaded('slow')).toBe(false);
    expect(source.backgrounds()).toEqual([]);
  });

  it('is no change for an id that is not installed', () => {
    const source = createHostIndex([hello()]);
    const before = source.version();
    source.remove('nobody');
    expect(source.version()).toBe(before);
  });
});
