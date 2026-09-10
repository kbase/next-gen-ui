import shapesJson from './shapes.json';

// Identifiers the workbench recognises in typed text by shape alone, under
// the prefix Bioregistry gives them: `P0AEX9` is `uniprot:P0AEX9` wherever
// it sits in a sentence, and so is `p0aex9`: the shape is matched in any
// case and the id minted in the registry's. The shapes are extracted from a pinned Bioregistry
// release by scripts/build-shapes.mjs, which also says why an entry is
// tagged only in its prefixed form (`taxon:562`): a bare integer names as
// many things as there are databases.

export interface Shape {
  prefix: string;
  name: string;
  // The registry's name and synonyms: what the prefix is called in prose.
  words: string[];
  // What may be typed before the colon to mean this prefix, lower-cased.
  aliases: string[];
  pattern: string;
  // Whether the id is recognised without a prefix.
  bare: boolean;
}

export interface Tag {
  term: string;
  prefix: string;
  id: string;
  // Where in the text the token sits, so a ranker can treat it as the kind
  // of thing it is rather than as letters.
  start: number;
  end: number;
}

interface Compiled extends Shape {
  re: RegExp;
  // The registry writes the id in one case; typed text comes in any.
  // A shape whose pattern names only upper-case letters is minted upper.
  upper: boolean;
}

const SHAPES: Compiled[] = (shapesJson as { shapes: Shape[] }).shapes.map((s) => ({
  ...s,
  re: new RegExp(s.pattern, 'i'),
  upper: !/[a-z]/.test(s.pattern.replace(/\\[a-zA-Z]/g, '')),
}));

// The id as the registry writes it: `p0aex9` is `P0AEX9` to UniProt.
const canonical = (shape: Compiled, id: string) => (shape.upper ? id.toUpperCase() : id);
const BARE = SHAPES.filter((s) => s.bare);
const BY_ALIAS = new Map<string, Compiled[]>();
for (const shape of SHAPES) {
  for (const alias of shape.aliases) {
    BY_ALIAS.set(alias, [...(BY_ALIAS.get(alias) ?? []), shape]);
  }
}
const BY_PREFIX = new Map(SHAPES.map((s) => [s.prefix, s]));

export const shapeFor = (prefix: string): Shape | undefined => BY_PREFIX.get(prefix);

// The prefix of a `prefix:value` term, and what it is called: the registry's
// words for a shape the workbench knows, the prefix's own letters otherwise.
export function namespaceOf(term: string): { prefix: string; id: string; words: string[] } | null {
  const at = term.indexOf(':');
  if (at <= 0) return null;
  const prefix = term.slice(0, at);
  const id = term.slice(at + 1);
  const shape = BY_PREFIX.get(prefix);
  return { prefix, id, words: shape ? shape.words : prefix.split(/[^a-zA-Z0-9]+/) };
}

// A token is a run of non-space characters less the quotes and brackets
// around it and the punctuation a sentence ends with. The inner colon of
// `taxon:562` survives; the one after `dossier:` does not matter, since
// nothing matches an empty id.
const TOKEN = /\S+/g;
const LEADING = /^[("'[{]+/;
const TRAILING = /[)"'\]}.,;:!?]+$/;

export function tagText(text: string): Tag[] {
  const tags: Tag[] = [];
  for (const match of text.matchAll(TOKEN)) {
    let start = match.index;
    let token = match[0];
    const lead = LEADING.exec(token)?.[0].length ?? 0;
    token = token.slice(lead);
    start += lead;
    token = token.replace(TRAILING, '');
    if (!token) continue;
    const end = start + token.length;
    const colon = token.indexOf(':');
    if (colon > 0) {
      const id = token.slice(colon + 1);
      for (const shape of BY_ALIAS.get(token.slice(0, colon).toLowerCase()) ?? []) {
        if (shape.re.test(id)) {
          const as = canonical(shape, id);
          tags.push({ term: `${shape.prefix}:${as}`, prefix: shape.prefix, id: as, start, end });
        }
      }
      continue;
    }
    for (const shape of BARE) {
      if (shape.re.test(token)) {
        const as = canonical(shape, token);
        tags.push({ term: `${shape.prefix}:${as}`, prefix: shape.prefix, id: as, start, end });
      }
    }
  }
  return tags;
}
