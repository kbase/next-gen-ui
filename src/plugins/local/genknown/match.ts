import type { Matcher, Offer } from '@kbase/plugin-sdk';

// GenKnown browses what is known about a genome, so it claims the
// identifiers that name one and the vocabulary of genomes and the
// organisms they came from.

const IDENTIFIERS: Array<[RegExp, (q: string) => Offer[]]> = [
  [
    /^GC[AF]_\d{9}(?:\.\d+)?$/i,
    (q) => [
      { label: `Genome ${q}`, action: { view: 'genome', assembly: q } },
      { label: `Annotations in ${q}`, action: { view: 'annotations', assembly: q } },
    ],
  ],
  [
    /^(?:taxon|taxid|ncbitaxon)[:_]\s?\d{1,8}$/i,
    (q) => [{ label: `Genomes under ${q}`, action: { view: 'taxon', taxon: q } }],
  ],
  // A KBase object: workspace/object, with an optional version.
  [
    /^\d+\/\d+(?:\/\d+)?$/,
    (q) => [{ label: `KBase genome ${q}`, action: { view: 'genome', ref: q } }],
  ],
  // Nucleotides. Note ACGT are also amino-acid letters, so a plain DNA
  // run matches Function Junction too — two plugins volunteering for one
  // string is the expected case, not a conflict.
  [
    /^[ACGTUN]{20,}$/i,
    (q) => [{ label: 'Find this nucleotide sequence', action: { view: 'blast', sequence: q } }],
  ],
  // A binomial: "Escherichia coli", "E. coli", "B. subtilis str. 168".
  // The genus must be abbreviated with a point or long enough to be one,
  // which is what keeps ordinary two-word phrases out.
  [
    /^(?:[A-Z]\.|[A-Z][a-z]{4,})\s+[a-z]{3,}(?:\s+(?:subsp|str|sp|var)\.?\s+\S+)?$/,
    (q) => [{ label: `Genomes of ${q}`, action: { view: 'organism', organism: q } }],
  ],
];

const TOPICS: Array<[string[], string, string]> = [
  [
    ['genome', 'assembly', 'contig', 'scaffold', 'plasmid', 'chromosome'],
    'genome',
    'Search genomes',
  ],
  [['organism', 'strain', 'isolate', 'culture'], 'organism', 'Search organisms'],
  [['taxonomy', 'taxon', 'clade', 'phylogeny', 'lineage', 'phylum'], 'taxon', 'Browse taxonomy'],
  [['pangenome', 'core-genome', 'accessory'], 'pangenome', 'Compare pangenomes'],
  [['16s', 'rrna', 'marker', 'barcode'], 'marker', 'Search marker genes'],
];

export const match: Matcher = (text) => {
  const q = text.trim();
  if (!q) return [];
  for (const [pattern, offers] of IDENTIFIERS) {
    if (pattern.test(q)) return offers(q);
  }
  // Both forms of a word ending in s, since it may be a plural (genomes)
  // or may not (16s); stripping outright loses the latter.
  const words = new Set(
    q
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .filter(Boolean)
      .flatMap((w) => (w.endsWith('s') ? [w, w.slice(0, -1)] : [w])),
  );
  for (const [terms, view, label] of TOPICS) {
    if (terms.some((t) => words.has(t))) return [{ label, action: { view, q } }];
  }
  return [];
};
