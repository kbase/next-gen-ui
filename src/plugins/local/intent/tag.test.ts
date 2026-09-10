import { describe, expect, it } from 'vitest';
import { namespaceOf, tagText } from './tag';

const terms = (text: string) => tagText(text).map((t) => t.term);

describe('tagging identifiers in typed text', () => {
  it('finds an accession inside a sentence, with its span', () => {
    const [tag] = tagText('I want a dossier for P0AEX9.');
    expect(tag).toEqual({
      term: 'uniprot:P0AEX9',
      prefix: 'uniprot',
      id: 'P0AEX9',
      start: 21,
      end: 27,
    });
  });

  it('reads a typed prefix by any of its registry aliases', () => {
    expect(terms('taxon:562')).toEqual(['ncbitaxon:562']);
    expect(terms('taxid:562 and ncbi:562')).toEqual(['ncbitaxon:562', 'ncbitaxon:562']);
    expect(terms('GO:0008150')).toEqual(['go:0008150']);
    expect(terms('CHEBI:15377')).toEqual(['chebi:15377']);
    expect(terms('PMID:16333295')).toEqual(['pubmed:16333295']);
  });

  // 767 registry patterns match a bare integer; none of them is minted.
  it('matches a shape in any case and mints the id in the registry case', () => {
    expect(tagText('dossier for p0aex9').map((t) => t.term)).toEqual(['uniprot:P0AEX9']);
    expect(tagText('gcf_000005845.2').map((t) => t.term)).toContain('insdc.gcf:GCF_000005845.2');
  });

  it('tags no bare integer', () => {
    expect(terms('562')).toEqual([]);
    expect(terms('0008150')).toEqual([]);
    expect(terms('what is 9606')).toEqual([]);
  });

  it('knows the shapes the plugins already mint', () => {
    expect(terms('GCF_000005845.2')).toEqual(['insdc.gcf:GCF_000005845.2']);
    expect(terms('RS_GCF_000005845.2')).toEqual(['gtdb.genome:RS_GCF_000005845.2']);
    expect(terms('12345/6/7')).toEqual(['upa:12345/6/7']);
    expect(terms('WP_000123456.1')).toEqual(['refseq:WP_000123456.1']);
    expect(terms('d__Bacteria;p__Pseudomonadota')).toEqual(['gtdb:d__Bacteria;p__Pseudomonadota']);
  });

  it('tags the accession-shaped and not the word-shaped', () => {
    // K00001 is also a well-formed INSDC nucleotide accession; both are minted.
    expect(terms('K00001 in K12')).toEqual(['insdc:K00001', 'kegg.orthology:K00001']);
    expect(terms('EC 1.1.1.1')).toEqual(['ec:1.1.1.1']);
    expect(terms('1abc but not 2024')).toEqual(['pdb:1abc']);
    expect(terms('malE recA Escherichia coli')).toEqual([]);
    expect(terms('PF00001 IPR000001')).toEqual(['pfam:PF00001', 'interpro:IPR000001']);
  });

  it('strips the punctuation around a token', () => {
    expect(terms('(P0AEX9), "Q9X0E6"?')).toEqual(['uniprot:P0AEX9', 'uniprot:Q9X0E6']);
  });
});

describe('what a term prefix is called', () => {
  it('uses the registry words for a known prefix', () => {
    expect(namespaceOf('ncbitaxon:562')?.words).toContain('NCBI Taxonomy');
    expect(namespaceOf('ncbitaxon:562')?.id).toBe('562');
  });

  it('falls back to the prefix letters for a plugin-minted one', () => {
    expect(namespaceOf('taxon-name:Cupriavidus')).toEqual({
      prefix: 'taxon-name',
      id: 'Cupriavidus',
      words: ['taxon', 'name'],
    });
    expect(namespaceOf('bare')).toBeNull();
  });
});
