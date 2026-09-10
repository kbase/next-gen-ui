import { describe, expect, it } from 'vitest';
import intent from './intent';

const signal = new AbortController().signal;

describe('the bundled intent', () => {
  intent.index([
    {
      plugin: 'function-junction',
      pluginTitle: 'Function Junction',
      name: 'open',
      title: 'Open the evidence dossier for a protein',
      args: [{ name: 'q', description: 'a UniProt or RefSeq id, a gene name, or a sequence' }],
    },
  ]);

  it('leads a row of its own with the identifier and captions it with the command', async () => {
    const [row] = await intent.suggest({ text: 'evidence for WP_000123456.1', terms: [], signal });
    expect(row.call.label).toBe('WP_000123456.1');
    expect(row.detail).toBe('Open the evidence dossier for a protein · Function Junction');
  });

  it("keeps a plugin's offer in the plugin's words", async () => {
    const offer = {
      label: 'Dossier for P0AEX9',
      command: 'function-junction:open',
      args: { q: 'P0AEX9' },
    };
    const [row] = await intent.suggest({ text: 'P0AEX9', terms: [], offers: [offer], signal });
    expect(row.call.label).toBe('Dossier for P0AEX9');
    expect(row.detail).toBeUndefined();
  });
});
