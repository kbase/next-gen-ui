// Regenerate src/plugins/local/intent/shapes.json from a pinned Bioregistry release.
//
// The intent plugin tags identifiers it recognises in typed text, under the
// prefix Bioregistry gives them, so the vocabulary is the registry's rather
// than one invented here. The registry itself is 3.7 MB and 1,700 patterns,
// many of them a bare `^\d+$`: a bare integer matches 767 of them, so only
// the prefixes listed in TAKE are extracted, and an entry whose registry
// pattern is too loose to trust on a bare token carries its own.
//
//   node scripts/build-shapes.mjs

import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const TAG = 'v0.14.5';
const SOURCE = `https://raw.githubusercontent.com/biopragmatics/bioregistry/${TAG}/exports/registry/registry.json`;
const OUT = new URL('../src/plugins/local/intent/shapes.json', import.meta.url);

// prefix -> overrides. `bare: false` means the id is tagged only when typed
// with its prefix (`taxon:562`, `GO:0008150`): the bare form is an integer
// that names as many things as there are databases. A `pattern` replaces the
// registry's where that one is unanchored, accepts stray characters, or
// matches a locus tag or a strain name.
const TAKE = {
  // The registry's pattern has commas and spaces inside its character classes.
  uniprot: {
    pattern: '^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$',
  },
  'uniprot.isoform': {
    pattern: '^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})-\\d+$',
  },
  uniref: {},
  uniparc: {},
  refseq: {},
  insdc: {},
  'insdc.gca': {},
  'insdc.gcf': {},
  // The registry's matches any four digits; a year is not a structure.
  pdb: { pattern: '^(?=.*[A-Za-z])[0-9][A-Za-z0-9]{3}$' },
  pfam: {},
  interpro: {},
  rfam: {},
  tigrfam: {},
  'panther.family': {},
  go: { bare: false },
  // The registry's `^K\d+$` matches the strain K12.
  'kegg.orthology': { pattern: '^K\\d{5}$' },
  'kegg.compound': { pattern: '^C\\d{5}$' },
  'kegg.reaction': { pattern: '^R\\d{5}$' },
  'kegg.module': { pattern: '^M\\d{5}$' },
  // `^\w{2,4}\d{5}$` is also the shape of a locus tag.
  'kegg.pathway': { bare: false },
  // The registry's accepts a bare "2" as an enzyme class.
  ec: { pattern: '^\\d{1,2}\\.\\d{1,3}\\.\\d{1,3}\\.(?:\\d{1,3}|-)$' },
  chebi: { bare: false },
  rhea: { bare: false },
  'pubchem.compound': { bare: false },
  cas: {},
  mesh: { bare: false },
  'seed.compound': {},
  'seed.reaction': {},
  pubmed: { bare: false },
  doi: {},
  // The registry's `^(\d+)|([a-zA-Z_]+)$` is anchored on one side only.
  ncbitaxon: { bare: false, pattern: '^\\d+$', aliases: ['ncbi'] },
  ncbigene: { bare: false },
  'img.taxon': { bare: false },
  'img.gene': { bare: false },
  // Ga/Gb/Gp/Gs and seven digits, per the NMDC schema's GOLD patterns.
  gold: { pattern: '^G[abps]\\d{7}$' },
  // The registry's is `^.{2,}$`; this is the schema's own.
  nmdc: {
    bare: false,
    pattern:
      '^[a-z]{1,6}-[0-9][a-z]{0,6}[0-9]-[A-Za-z0-9]+(?:\\.[A-Za-z0-9]+)*(?:_[A-Za-z0-9_.-]+)?$',
  },
  gtdb: {},
  biosample: {},
  bioproject: {},
  'insdc.sra': {},
};

// Shapes Bioregistry has no entry for.
const LOCAL = [
  {
    prefix: 'upa',
    name: 'KBase workspace object',
    words: ['KBase', 'workspace', 'UPA', 'object reference', 'dataset', 'ref'],
    aliases: ['ws', 'workspace', 'dataset'],
    pattern: '^\\d+/\\d+(?:/\\d+)?$',
    bare: true,
  },
  {
    prefix: 'gtdb.genome',
    name: 'GTDB genome',
    words: ['GTDB', 'genome', 'assembly', 'accession', 'RefSeq', 'GenBank'],
    aliases: [],
    pattern: '^(?:RS|GB)_GC[AF]_\\d{9}\\.\\d+$',
    bare: true,
  },
];

const ALIAS = /^[a-z0-9_.-]+$/;

const registry = await (await fetch(SOURCE)).json();
const shapes = [];
for (const [prefix, over] of Object.entries(TAKE)) {
  const entry = registry[prefix];
  if (!entry) throw new Error(`${prefix} is not in Bioregistry ${TAG}`);
  const pattern = over.pattern ?? entry.pattern;
  if (!pattern) throw new Error(`${prefix} has no pattern`);
  new RegExp(pattern); // throws on a pattern JavaScript cannot compile
  const synonyms = entry.synonyms ?? [];
  const aliases = new Set([prefix, ...(over.aliases ?? [])]);
  if (entry.banana) aliases.add(entry.banana.toLowerCase());
  for (const s of synonyms) if (ALIAS.test(s.toLowerCase())) aliases.add(s.toLowerCase());
  shapes.push({
    prefix,
    name: entry.name,
    words: [entry.name, ...synonyms],
    aliases: [...aliases].sort(),
    pattern,
    bare: over.bare ?? true,
  });
}
for (const local of LOCAL) {
  new RegExp(local.pattern);
  shapes.push({ ...local, aliases: [...new Set([local.prefix, ...local.aliases])].sort() });
}
shapes.sort((a, b) => a.prefix.localeCompare(b.prefix));

await writeFile(OUT, JSON.stringify({ bioregistry: TAG, shapes }, null, 2) + '\n');
// Laid out the way the repo's formatter would, so a regeneration diffs only
// where the registry changed.
execFileSync('npx', ['prettier', '--write', OUT.pathname], { stdio: 'ignore' });
console.log(`${shapes.length} shapes from Bioregistry ${TAG} → ${OUT.pathname}`);
