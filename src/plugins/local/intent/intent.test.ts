import { describe, expect, it } from 'vitest';
import type { TieredTerms } from '@kbase/plugin-sdk';
import intent from './intent';

const signal = new AbortController().signal;
const NOTHING: TieredTerms = { typed: [], page: [], cart: [] };

describe('the bundled intent', () => {
  intent.index(
    [
      {
        plugin: 'function-junction',
        pluginTitle: 'Function Junction',
        name: 'open',
        title: 'Open the evidence dossier for a protein',
        args: [{ name: 'q', description: 'a UniProt or RefSeq id, a gene name, or a sequence' }],
      },
    ],
    [
      {
        plugin: 'related',
        pluginTitle: 'Related',
        label: 'Show Related',
        command: 'workbench:show',
        args: { plugin: 'related' },
        description: 'What other plugins have about the open panel and the cart.',
      },
    ],
  );

  it('leads a row of its own with the identifier and captions it with the command', async () => {
    const [row] = await intent.suggest({
      text: 'evidence for WP_000123456.1',
      terms: NOTHING,
      offers: [],
      signal,
    });
    expect(row.call.label).toBe('WP_000123456.1');
    expect(row.detail).toBe('Open the evidence dossier for a protein · Function Junction');
  });

  it("keeps a plugin's offer in the plugin's words", async () => {
    const offer = {
      label: 'Dossier for P0AEX9',
      command: 'function-junction:open',
      args: { q: 'P0AEX9' },
      match: { term: 'uniprot:P0AEX9', kind: 'identifier' as const },
    };
    const [row] = await intent.suggest({
      text: 'P0AEX9',
      terms: NOTHING,
      offers: [offer],
      signal,
    });
    expect(row.call.label).toBe('Dossier for P0AEX9');
    expect(row.detail).toBeUndefined();
  });

  // The row for text the intent alone reads: nothing was typed but the word,
  // and the accession the cart holds is what fills the argument.
  it('answers for what the cart carries under text that names no identifier', async () => {
    const [row] = await intent.suggest({
      text: 'dossier',
      terms: { ...NOTHING, cart: ['uniprot:P0AEX9'] },
      offers: [],
      signal,
    });
    expect(row.call).toEqual({
      label: 'P0AEX9',
      command: 'function-junction:open',
      args: { q: 'P0AEX9' },
    });
  });
});
