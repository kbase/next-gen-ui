import { describe, expect, it, vi } from 'vitest';
import { definePluginManifest, qualifyCommand } from '../../plugins/sdk';
import { createWorkbench, pluginHostFor } from './createWorkbench';
import { localPlugin } from './local';
import { noPersistence } from './persistence';

// genKnown owns a command and adds items; KOROS owns neither and is handed one
// of those items, which is the case a cart item exists for.
function workbench(open: () => void) {
  return createWorkbench({
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
