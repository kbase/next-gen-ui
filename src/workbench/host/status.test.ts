import { describe, expect, it, vi } from 'vitest';
import type { Background } from '@kbase/plugin-sdk';
import { definePluginManifest } from '@kbase/plugin-sdk';
import { createHostIndex } from './plugins/installed';
import { localPlugin } from './plugins/local';
import { createStatusStore } from './status';

// A plugin whose status pushes one line as soon as the host subscribes.
function pushing(id: string, line: string, stop = vi.fn()) {
  let push: ((items: { text: string }[]) => void) | undefined;
  const background: Background = {
    status: (set) => {
      push = set;
      set([{ text: line }]);
      return stop;
    },
  };
  return {
    stop,
    push: (items: { text: string }[]) => push?.(items),
    plugin: localPlugin({
      config: definePluginManifest({ id, title: id }),
      background: () => Promise.resolve(background),
    }),
  };
}

describe('the status store and an uninstalled plugin', () => {
  it('ends its subscription, drops its lines and ignores a late push', async () => {
    const hello = pushing('hello', 'Hello is up');
    const source = createHostIndex([hello.plugin]);
    const status = createStatusStore(source);
    await vi.waitFor(() =>
      expect(status.all()).toEqual([{ plugin: 'hello', items: [{ text: 'Hello is up' }] }]),
    );

    source.remove('hello');

    expect(hello.stop).toHaveBeenCalledTimes(1);
    expect(status.all()).toEqual([]);
    hello.push([{ text: 'still here' }]);
    expect(status.all()).toEqual([]);
  });

  it('subscribes to a plugin added later', async () => {
    const source = createHostIndex([]);
    const status = createStatusStore(source);
    const late = pushing('late', 'Late is up');

    source.add(late.plugin);

    await vi.waitFor(() =>
      expect(status.all()).toEqual([{ plugin: 'late', items: [{ text: 'Late is up' }] }]),
    );
  });
});
