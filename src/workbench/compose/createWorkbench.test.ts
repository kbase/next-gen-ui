import { describe, expect, it, vi } from 'vitest';
import type { CartItem, DeclaredCall } from '@kbase/plugin-sdk';
import { definePluginManifest, qualifyCommand } from '@kbase/plugin-sdk';
import { localPlugins } from '../../plugins/local';
import { createWorkbench } from './createWorkbench';
import { defaultContext, defaultLayout, groups, paneId, placementOf, reduce } from '../core';
import type { LoadedDocs } from '../host/persistence';
import { pluginHostFor } from '../host/pluginHost';
import { localPlugin } from '../host/plugins/local';
import { noPersistence } from '../host/persistence';

// genKnown owns a command and adds items; KOROS owns neither and is handed one
// of those items, which is the case a cart item exists for.
function workbench(open: () => void) {
  return createWorkbench({
    // Named because a workbench is built with both chosen; nothing here
    // types into the prompt bar, so neither choice is exercised.
    defaultAssistant: 'koros',
    defaultIntent: 'intent',
    installed: [
      localPlugin({
        config: definePluginManifest({
          id: 'gk',
          title: 'genKnown',
          description: 'A plugin that opens a taxon.',
          icon: 'Code',
          commands: [{ name: 'open', title: 'Open a taxon' }],
        }),
        commands: () => Promise.resolve({ open }),
      }),
      localPlugin({
        config: definePluginManifest({
          id: 'koros',
          title: 'KOROS',
          description: 'A plugin that reads what others collected.',
          icon: 'ChatCircleDots',
        }),
      }),
    ],
    persistence: noPersistence,
  });
}

describe('the plugin-scoped cart', () => {
  // `Cart.add` does not take `plugin`, so a plugin cannot name one in a
  // literal; this is the other half, for an object that arrives with one
  // anyway — over a frame bridge, say.
  it('stamps the adding plugin over whatever the item claimed', () => {
    const services = workbench(vi.fn());
    const claimed = { id: 'gk:83333', name: 'Escherichia coli', plugin: 'koros' };
    pluginHostFor(services, 'gk').cart.add(claimed);
    expect(services.cart.items()[0].plugin).toBe('gk');
  });

  // The stamp is what makes the pointer followable: it names whose command
  // `source.command` is, and every consumer qualifies with it.
  it('lets another plugin run the command an item points back with', async () => {
    const open = vi.fn();
    const services = workbench(open);
    pluginHostFor(services, 'gk').cart.add({
      id: 'gk:83333',
      name: 'Escherichia coli',
      source: { command: 'open', args: { q: '83333' } },
    });

    const item = services.cart.items()[0];
    const koros = pluginHostFor(services, 'koros');
    // Bare, the name would be KOROS's own command, and KOROS has none.
    expect(koros.hasCommand(item.source!.command)).toBe(false);

    await koros.execute(qualifyCommand(item.source!.command, item.plugin), item.source!.args);
    expect(open).toHaveBeenCalledWith({ q: '83333' }, expect.objectContaining({ caller: 'koros' }));
  });
});

// Everything the prompt bar can offer for typed text is ranked by the chosen
// intent, so everything the bar can offer has to be in what the intent is
// handed. A declared command is one candidate; the calls a manifest already
// filled in are the others, and a pane — which is a module and no command at
// all — is reachable only through the workbench's own `show`.
describe('the catalog the intent is handed', () => {
  const calls = async (): Promise<DeclaredCall[]> => {
    const index = vi.fn();
    createWorkbench({
      defaultAssistant: 'koros',
      defaultIntent: 'ranker',
      installed: [
        localPlugin({
          config: definePluginManifest({
            id: 'fj',
            title: 'Function Junction',
            description: 'Protein evidence.',
            commands: [{ name: 'open', title: 'Open the dossier' }],
            shortcuts: [{ label: 'Dossier', command: 'open', args: { q: 'P0AEX9' } }],
            launcher: { label: 'Function Junction', command: 'open' },
          }),
          pane: () => Promise.resolve({ mount: () => {} }),
        }),
        localPlugin({
          config: definePluginManifest({ id: 'ranker', title: 'Ranker' }),
          intent: () => Promise.resolve({ index, suggest: () => [] }),
        }),
      ],
      persistence: noPersistence,
    });
    await vi.waitFor(() => expect(index).toHaveBeenCalled());
    return (index.mock.calls[0] as [unknown, DeclaredCall[]])[1];
  };

  it('holds the launcher, the shortcut buttons and the pane of each plugin', async () => {
    expect((await calls()).filter((c) => c.plugin === 'fj')).toEqual([
      {
        label: 'Function Junction',
        command: 'fj:open',
        plugin: 'fj',
        pluginTitle: 'Function Junction',
        // A launcher stands for the whole plugin, so it carries what the
        // plugin says it is; a shortcut stands for one command and does not.
        description: 'Protein evidence.',
      },
      {
        label: 'Dossier',
        command: 'fj:open',
        args: { q: 'P0AEX9' },
        plugin: 'fj',
        pluginTitle: 'Function Junction',
      },
      {
        label: 'Show Function Junction',
        command: 'workbench:show',
        args: { plugin: 'fj' },
        plugin: 'fj',
        pluginTitle: 'Function Junction',
        description: 'Protein evidence.',
      },
    ]);
  });

  // The command a pane's call names has to be one the registry can run, or
  // the row would open an error.
  it('names a command the workbench has registered for a pane', async () => {
    const services = createWorkbench({
      defaultAssistant: 'koros',
      defaultIntent: 'ranker',
      installed: [],
      persistence: noPersistence,
    });
    const pane = (await calls()).find((c) => c.command === 'workbench:show');
    expect(services.registry.get(pane!.command)).toBeDefined();
  });
});

// What a plugin hands the host is checked where it hands it over, and the
// refusal goes back to that call: the plugin's own frame is on the stack, so
// it is the one that can say what it meant. Nothing the workbench keeps has
// a shape it did not check.
describe('a value a plugin hands the host', () => {
  it('is refused, naming the field, when its source names no command', () => {
    const services = workbench(vi.fn());
    const gk = pluginHostFor(services, 'gk');
    // The shape Function Junction's Python half still sends (K90, K125).
    const sent = { id: 'gk:83333', name: 'E. coli', source: { path: '/83333' } } as unknown as CartItem;
    expect(() => gk.cart.add(sent)).toThrow(/plugin gk: cart.add refused the item — source\.command/);
    expect(services.cart.items()).toEqual([]);
  });

  it('is refused when it is a notice that is not text', () => {
    const services = workbench(vi.fn());
    const gk = pluginHostFor(services, 'gk');
    expect(() => gk.notify(undefined as unknown as string)).toThrow(
      /plugin gk: notify refused the text/,
    );
  });

  it("is refused when it is a command's arguments and one is not a string", async () => {
    const services = workbench(vi.fn());
    const gk = pluginHostFor(services, 'gk');
    const args = { q: 83333 } as unknown as Record<string, string>;
    await expect(gk.execute('open', args)).rejects.toThrow(
      /plugin gk: execute refused the arguments for \/gk:open — q/,
    );
  });

  it('is refused when it is a path that is not a string', () => {
    const services = workbench(vi.fn());
    const gk = pluginHostFor(services, 'gk');
    expect(() => gk.openRoute(null as unknown as string)).toThrow(
      /plugin gk: openRoute refused the path/,
    );
  });
});

// A saved layout is restored as written, so a block added to the defaults
// after it was saved has no way into it on its own. Which blocks a reader has
// been offered is kept in the settings document, beside the cart, where a
// layout key bump does not reach.
describe('a default pin a saved layout has never been offered', () => {
  const saved = () => {
    // A layout saved when the defaults were ['koros'] alone.
    const layout = defaultLayout({ pinned: ['koros'] });
    return { layout, settings: { assistant: 'koros', intent: 'intent', keybindings: {} } };
  };
  const build = (docs: Partial<LoadedDocs>, save = vi.fn()) =>
    createWorkbench({
      installed: localPlugins,
      persistence: { loaded: { layout: null, cart: null, settings: null, ...docs }, save },
      defaultPinned: ['koros', 'jobs'],
      defaultAssistant: 'koros',
      defaultIntent: 'intent',
    });

  it('is pinned once at startup and recorded as offered', () => {
    const save = vi.fn();
    const { layout, settings } = saved();
    const services = build({ layout, settings }, save);
    expect(services.store.get().sidebar.pinned).toEqual(['koros', 'jobs']);
    expect(services.settings.get().offered).toEqual(['koros', 'jobs']);
    expect(save).toHaveBeenCalledWith('settings', expect.objectContaining({ offered: ['koros', 'jobs'] }));
  });

  it('stays unpinned on the next load once it has been offered', () => {
    const { layout } = saved();
    // The reader unpinned jobs after it was offered.
    const services = build({
      layout,
      settings: { assistant: 'koros', intent: 'intent', keybindings: {}, offered: ['koros', 'jobs'] },
    });
    expect(services.store.get().sidebar.pinned).toEqual(['koros']);
  });

  it('leaves a pane the reader moved to the main area where it is', () => {
    const { layout, settings } = saved();
    const inMain = reduce(
      reduce(layout, { type: 'pin', plugin: 'jobs' }, defaultContext),
      { type: 'move', panel: paneId('jobs'), to: { group: groups(layout.main)[0].id } },
      defaultContext,
    );
    // Moved out, the plugin stays pinned and its pane is a tab.
    expect(placementOf(inMain, paneId('jobs')).zone).toBe('main');
    const services = build({ layout: inMain, settings });
    expect(services.store.get()).toEqual(inMain);
    expect(placementOf(services.store.get(), paneId('jobs')).zone).toBe('main');
    expect(services.settings.get().offered).toEqual(['koros', 'jobs']);
  });
});
