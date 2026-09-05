import type { Matcher, Offer } from '@kbase/plugin-sdk';

// Function Junction converges every line of functional evidence on one
// protein, so it claims the identifiers that name a protein and the
// vocabulary of the evidence it aggregates. Both lists are the plugin's
// own: the host has no idea what a Pfam family is, and does not need to.

// Identifiers, in the shapes their registries publish, and what this app
// would do with each. An accession offers two things, because there are
// two places worth landing.
const IDENTIFIERS: Array<[RegExp, (q: string) => Offer[]]> = [
  [
    /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$/i,
    (q) => [
      { label: `Protein dossier for ${q}`, action: { view: 'dossier', accession: q } },
      { label: `Predicted structure of ${q}`, action: { view: 'structure', accession: q } },
    ],
  ],
  [
    /^(?:EC[: ]?)?\d+\.\d+\.\d+\.(?:\d+|-)$/i,
    (q) => [
      {
        label: `Reactions for EC ${q.replace(/^EC[: ]?/i, '')}`,
        action: { view: 'reaction', ec: q },
      },
    ],
  ],
  [/^PF\d{5}$/i, (q) => [{ label: `Proteins in Pfam ${q}`, action: { view: 'domain', pfam: q } }]],
  [
    /^IPR\d{6}$/i,
    (q) => [{ label: `Proteins in InterPro ${q}`, action: { view: 'domain', interpro: q } }],
  ],
  [/^K\d{5}$/, (q) => [{ label: `KEGG ortholog ${q}`, action: { view: 'ortholog', ko: q } }]],
  [
    /^[0-9][A-Za-z0-9]{3}$/,
    (q) => [{ label: `PDB entry ${q}`, action: { view: 'structure', pdb: q } }],
  ],
  // A gene symbol: lowercase stem, capitalised suffix — nifH, recA, rpoB.
  // The capital is what keeps ordinary words out.
  [
    /^[a-z]{2,4}[A-Z][0-9]?$/,
    (q) => [{ label: `Evidence for the gene ${q}`, action: { view: 'dossier', gene: q } }],
  ],
  // Amino-acid residues. A short run is a word, not a sequence.
  [
    /^[ACDEFGHIKLMNPQRSTVWY]{20,}$/i,
    (q) => [{ label: 'Identify this protein sequence', action: { view: 'identify', sequence: q } }],
  ],
];

// The words its users use, and the evidence axis each lands on.
const TOPICS: Array<[string[], string, string]> = [
  [
    ['structure', 'alphafold', 'pdb', 'fold', 'foldseek', 'conformation'],
    'structure',
    'Search structural evidence',
  ],
  [
    ['ortholog', 'homolog', 'paralog', 'interaction', 'neighborhood', 'operon'],
    'ortholog',
    'Search orthologs and neighborhoods',
  ],
  [['fitness', 'tnseq', 'essential', 'knockout', 'phenotype'], 'fitness', 'Search fitness data'],
  [['domain', 'pfam', 'interpro', 'motif', 'architecture'], 'domain', 'Search domain families'],
  [
    ['paper', 'literature', 'publication', 'paperblast', 'citation'],
    'literature',
    'Search the literature',
  ],
  [
    ['protein', 'enzyme', 'annotation', 'function', 'kinase', 'transporter', 'reaction', 'pathway'],
    'search',
    'Search proteins',
  ],
];

export const match: Matcher = (text) => {
  const q = text.trim();
  if (!q) return [];
  for (const [pattern, offers] of IDENTIFIERS) {
    if (pattern.test(q)) return offers(q);
  }
  // Both forms of a word ending in s, since it may be a plural (proteins)
  // or may not (fitness); stripping outright loses the latter.
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
