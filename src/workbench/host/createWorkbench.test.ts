import { describe, expect, it, vi } from 'vitest';
import type { DeclaredCall } from '../../plugins/sdk';
import { definePluginManifest, qualifyCommand } from '../../plugins/sdk';
import { createWorkbench, pluginHostFor } from './createWorkbench';
import { localPlugin } from './local';
import { noPersistence } from './persistence';

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
