import { describe, expect, it, vi } from 'vitest';
import { createTermStore } from './terms';

describe('what each panel says it is about', () => {
  it('holds terms per panel and forgets a closed one', () => {
    const terms = createTermStore();
    terms.set('fj/document?q=P0AEX9', ['uniprot:P0AEX9', 'taxon:562']);
    expect(terms.get('fj/document?q=P0AEX9')).toEqual(['uniprot:P0AEX9', 'taxon:562']);
    expect(terms.get('someone/else')).toEqual([]);
    terms.forget('fj/document?q=P0AEX9');
    expect(terms.get('fj/document?q=P0AEX9')).toEqual([]);
  });

  // A panel declares its terms from its render, so the same values arrive on
  // every pass. Waking the pane each time would re-ask every plugin.
  it('says nothing changed when the same terms are set again', () => {
    const terms = createTermStore();
    const seen = vi.fn();
    terms.subscribe(seen);
    terms.set('p', ['taxon:562']);
    terms.set('p', ['taxon:562']);
    expect(seen).toHaveBeenCalledTimes(1);
    terms.set('p', ['taxon:562', 'genome:GCF_1']);
    expect(seen).toHaveBeenCalledTimes(2);
  });
});
