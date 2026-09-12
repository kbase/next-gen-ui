import type {
  ArgDecl,
  ContextTier,
  DeclaredCall,
  DeclaredCommand,
  Match,
  MatchKind,
  Offer,
  TieredTerms,
} from '@kbase/plugin-sdk';
import { CONTEXT_TIERS, qualifyCommand } from '@kbase/plugin-sdk';
import type { Tag } from './tag';
import { namespaceOf, shapeFor } from './tag';

// Ranking everything the workbench can be asked to do against typed text,
// and filling arguments from the terms the text carries.
//
// Two kinds of candidate, which differ in one thing: whether the text fills
// anything in. A declared command has argument holes, and the identifiers in
// the text and in view are what fill them. A declared call — a launcher, a
// shortcut button, a plugin's pane — was written with its arguments already
// in it and runs as written, so the text only decides whether it is worth
// showing, and it is matched on the words its author gave it: the plugin's
// name and description, and the label on the button.
//
// A command is indexed by what its declaration says about it: the plugin,
// the name, the title, the descriptions, the semantics section, the examples.
// Text is scored against that by character n-gram cosine, which is what
// held up best on partial words and on descriptions that share letters but
// not tokens with what was typed. An identifier in the text is scored as
// what it is rather than as letters: its span is replaced by the registry's
// name for the prefix, so `P0AEX9` reads as "UniProt Protein" against an
// argument described as "a UniProt or RefSeq id".
//
// An argument is filled by the same cosine, between the prefix's words and
// the argument's description, when one argument clearly takes the term.
// No shared vocabulary is assumed between the plugin that mints a prefix
// and the one whose argument takes it: a description that says what it
// takes, in words, is enough.
//
// Terms arrive under three tiers — typed, the front tab's, the cart's — and
// bind arguments in that order: the identifier in the sentence takes the
// argument before the one the user merely has around, and a term already
// taken under a stronger tier is not offered again under a weaker one. A
// term from the page or the cart binds arguments but never scores letters:
// the text the user typed is the only thing the cosine reads.
//
// A command a plugin offered is a candidate like any other, ranked by the
// letters and never dropped by them, and it carries the plugin's account of
// why: which term it answers and whether the plugin holds the thing
// (`record`), recognised an id it serves without looking it up
// (`identifier`), or matched a label (`name`). That account and the term's
// tier are what the row is weighted by — a coincidental accession in a
// sentence about chess is still an `identifier` claim and still ranks above
// the floor, but one the plugin can read out of its own inventory outranks
// it, and one the user only has in the cart is worth less than one they
// typed. A row nobody offered is weighted by the ranker's own account of the
// term that filled its argument, which is the weakest account there is.

// What a row is weighted by: the plugin's account of its offer, or the
// ranker's own account of the term that filled an argument, under the tier
// the term arrived in.
export interface Evidence extends Match {
  tier: ContextTier;
}

export interface RankedCall {
  // Whose row it is: the plugin that declared the command, or the one whose
  // manifest wrote the call. A pane's call runs the workbench's `open` and
  // belongs to the plugin it shows.
  plugin: string;
  pluginTitle: string;
  // Qualified: "plugin:name".
  command: string;
  title: string;
  // The author's wording, when the row is a plugin's offer or a call a
  // manifest wrote.
  label?: string;
  // The caption a call carries: the plugin's description, where the call
  // stands for the whole plugin.
  detail?: string;
  args: Record<string, string>;
  // What lifted this row above its text score. Absent when nothing did: a
  // command matched by its description alone, with no term behind it, or a
  // call, which nothing lifts.
  evidence?: Evidence;
  score: number;
}

interface Entry {
  // `command`: an argument the text may fill. `call`: a row that runs as its
  // manifest wrote it.
  kind: 'command' | 'call';
  plugin: string;
  pluginTitle: string;
  command: string;
  title: string;
  label?: string;
  detail?: string;
  // What the manifest already filled in. A declared command fills nothing.
  filled?: Record<string, string>;
  args: ArgDecl[];
  vector: Map<string, number>;
  // Each argument's description as a vector, for binding.
  argVectors: Map<string, number>[];
}

export interface CommandIndex {
  entries: Entry[];
  idf: Map<string, number>;
}

// Below this cosine a match is letters in common, not a command in mind.
// Chosen where, on the routing set, coverage was still 96% and precision
// rose; at 0.3 precision rose further but a tenth of real queries went
// unanswered.
export const FLOOR = 0.2;
// Below this an argument's description does not say it takes the term.
export const BIND_FLOOR = 0.15;

// What a row's evidence adds to its text score: the weight of the kind of
// match, times the weight of the tier the term came from. Neither table is
// measured. `identifier` at `typed` is 0.1, the constant every offer used to
// get, so a plugin that says no more than the old contract could say scores
// exactly where it did; the other kinds sit one step either side of it, and
// the order of the six numbers is the whole of what is claimed. Calibrating
// them needs the routing set FLOOR was chosen on, which is not in this repo.
export const MATCH_WEIGHT: Record<MatchKind, number> = {
  record: 0.15,
  identifier: 0.1,
  name: 0.05,
};
// A term in the text is worth twice one the front tab carries, and the cart
// a little less than the tab: a cart fills up over a session and its oldest
// item is no longer what the user is looking at.
export const TIER_WEIGHT: Record<ContextTier, number> = { typed: 1, page: 0.5, cart: 0.4 };

const weigh = (evidence?: Evidence): number =>
  evidence ? MATCH_WEIGHT[evidence.kind] * TIER_WEIGHT[evidence.tier] : 0;

const N_MIN = 2;
const N_MAX = 5;

// Character n-grams within word boundaries, each word padded with a space.
function grams(text: string): string[] {
  const out: string[] = [];
  for (const word of text.toLowerCase().split(/\s+/)) {
    if (!word) continue;
    const padded = ` ${word} `;
    for (let n = N_MIN; n <= N_MAX; n++) {
      for (let i = 0; i + n <= padded.length; i++) out.push(padded.slice(i, i + n));
    }
  }
  return out;
}

function counts(text: string): Map<string, number> {
  const c = new Map<string, number>();
  for (const g of grams(text)) c.set(g, (c.get(g) ?? 0) + 1);
  return c;
}

// Sublinear tf, smoothed idf, unit length: sklearn's defaults, which the
// numbers were measured with.
function vectorize(
  text: string,
  idf: Map<string, number>,
  fallbackIdf: number,
): Map<string, number> {
  const v = new Map<string, number>();
  let norm = 0;
  for (const [g, tf] of counts(text)) {
    const w = (1 + Math.log(tf)) * (idf.get(g) ?? fallbackIdf);
    v.set(g, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [g, w] of v) v.set(g, w / norm);
  return v;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [g, w] of small) dot += w * (large.get(g) ?? 0);
  return dot;
}

const argText = (arg: ArgDecl) => `${arg.name} ${arg.description ?? ''}`;

type Doc = Omit<Entry, 'vector' | 'argVectors'> & { text: string };

function commandDoc(decl: DeclaredCommand): Doc {
  return {
    kind: 'command',
    plugin: decl.plugin,
    pluginTitle: decl.pluginTitle,
    command: qualifyCommand(decl.name, decl.plugin),
    title: decl.title,
    args: decl.args ?? [],
    text: [
      decl.plugin,
      decl.pluginTitle,
      decl.name,
      decl.title,
      decl.description ?? '',
      decl.semantics?.description ?? '',
      ...(decl.semantics?.examples ?? []),
      ...(decl.args ?? []).map(argText),
    ].join(' '),
  };
}

// The command a call names is left out of its text: a pane's call names the
// workbench's `open`, and indexing that word would put every pane on screen
// for anyone typing "open". What the author wrote is the plugin's name, its
// description and the label on the button.
function callDoc(call: DeclaredCall): Doc {
  return {
    kind: 'call',
    plugin: call.plugin,
    pluginTitle: call.pluginTitle,
    command: call.command,
    title: call.label,
    label: call.label,
    detail: call.description,
    filled: call.args ?? {},
    args: [],
    text: [call.plugin, call.pluginTitle, call.label, call.description ?? ''].join(' '),
  };
}

export function buildCommandIndex(
  commands: DeclaredCommand[],
  calls: DeclaredCall[] = [],
): CommandIndex {
  const docs = [...commands.map(commandDoc), ...calls.map(callDoc)];
  const df = new Map<string, number>();
  for (const { text } of docs) {
    for (const g of new Set(grams(text))) df.set(g, (df.get(g) ?? 0) + 1);
  }
  const n = docs.length;
  const idf = new Map([...df].map(([g, d]) => [g, Math.log((1 + n) / (1 + d)) + 1]));
  const unseen = Math.log((1 + n) / 1) + 1;
  const entries = docs.map(({ text, ...doc }) => ({
    ...doc,
    vector: vectorize(text, idf, unseen),
    argVectors: doc.args.map((a) => vectorize(argText(a), idf, unseen)),
  }));
  return { entries, idf };
}

// The text with each tagged span read as the kind of thing it is.
function reading(text: string, tags: Tag[]): string {
  let out = '';
  let at = 0;
  for (const tag of [...tags].sort((a, b) => a.start - b.start)) {
    if (tag.start < at) continue;
    out += text.slice(at, tag.start) + (shapeFor(tag.prefix)?.name ?? tag.prefix);
    at = tag.end;
  }
  return out + text.slice(at);
}

// A term and where it came from. Every term in play appears once, under the
// strongest tier that carried it, and the tiers come in the contract's order,
// which is strongest first.
interface Term {
  term: string;
  tier: ContextTier;
}

function tiered(tags: Tag[], terms: TieredTerms): Term[] {
  const seen = new Set<string>();
  const pool: Term[] = [];
  for (const tier of CONTEXT_TIERS) {
    const found = tier === 'typed' ? [...tags.map((t) => t.term), ...terms.typed] : terms[tier];
    for (const term of found) {
      if (seen.has(term)) continue;
      seen.add(term);
      pool.push({ term, tier });
    }
  }
  return pool;
}

// One argument per term: the unfilled one whose description takes it best,
// the earlier declared of two that take it equally. A term no argument
// takes fills nothing. The evidence is the first term that bound, so the
// row is weighted by the strongest tier that reached it — the pool is in
// tier order, and a term binds an argument the same way whatever tier it
// came from.
function bind(
  entry: Entry,
  index: CommandIndex,
  pool: Term[],
): { args: Record<string, string>; evidence?: Evidence } {
  const args: Record<string, string> = {};
  let evidence: Evidence | undefined;
  const unseen = Math.log((1 + index.entries.length) / 1) + 1;
  for (const { term, tier } of pool) {
    const ns = namespaceOf(term);
    if (!ns) continue;
    const query = vectorize(ns.words.join(' '), index.idf, unseen);
    let best: { arg: string; score: number } | undefined;
    entry.argVectors.forEach((v, i) => {
      const arg = entry.args[i].name;
      const score = cosine(query, v);
      if (!(arg in args) && score >= BIND_FLOOR && (!best || score > best.score)) {
        best = { arg, score };
      }
    });
    if (!best) continue;
    args[best.arg] = ns.id;
    // The ranker's own account of the match, and the weakest of the three:
    // what matched is the namespace's words against the argument's
    // description, which is words against words. A plugin claiming the same
    // term as an identifier is saying something this cannot — that it serves
    // the namespace — and outranks it.
    evidence ??= { term, kind: 'name', tier };
  }
  return { args, evidence };
}

export function rankCommands(
  index: CommandIndex,
  text: string,
  tags: Tag[],
  terms: TieredTerms,
  offers: Offer[] = [],
  limit = 4,
): RankedCall[] {
  const trimmed = text.trim();
  if (trimmed.length < 2 || !index.entries.length) return [];
  const unseen = Math.log((1 + index.entries.length) / 1) + 1;
  const query = vectorize(reading(trimmed, tags), index.idf, unseen);
  const pool = tiered(tags, terms);
  const tierOf = new Map(pool.map(({ term, tier }) => [term, tier]));
  const offered = new Map<string, Offer>();
  for (const offer of offers) if (!offered.has(offer.command)) offered.set(offer.command, offer);
  // A plugin's claim is weighed only about a term the query carried: an
  // offer for something the workbench never put in front of it is still a
  // row, at the letters it scores.
  const claimed = (offer: Offer): Evidence | undefined => {
    const tier = tierOf.get(offer.match.term);
    return tier ? { ...offer.match, tier } : undefined;
  };
  // Two candidates that would run the same command with the same arguments
  // are one row, whatever words each came with: a plugin's shortcut for a
  // command it also declares, a launcher that opens the pane the plugin's own
  // row opens. The better-scoring wording is the one kept.
  const same = (command: string, args: Record<string, string>) =>
    [command, ...Object.entries(args).sort()].join(' ');
  const kept = new Set<string>();
  return (
    index.entries
      .map((entry) => {
        // Nothing the text carries fills a call: it runs as its manifest
        // wrote it, and nothing the plugins offered is about it.
        if (entry.kind === 'call') {
          const letters = cosine(query, entry.vector);
          return {
            entry,
            offer: undefined,
            evidence: undefined,
            args: entry.filled ?? {},
            letters,
            score: letters,
          };
        }
        const offer = offered.get(entry.command);
        const bound = offer ? undefined : bind(entry, index, pool);
        const evidence = offer ? claimed(offer) : bound?.evidence;
        // The floor is read against the letters alone, so no amount of
        // evidence can put a command the sentence does not name on screen.
        const letters = cosine(query, entry.vector);
        return {
          entry,
          offer,
          evidence,
          args: offer ? (offer.args ?? {}) : (bound?.args ?? {}),
          letters,
          score: letters + weigh(evidence),
        };
      })
      // A plugin's own offer is the plugin saying it recognised the text; it
      // is ranked by the letters like the rest, never dropped by them.
      .filter(({ offer, letters }) => offer || letters >= FLOOR)
      // A row runs when pressed, so a command is offered only with every
      // required argument filled: "kill the running job" names no job, and a
      // row for it would open an error, not a job.
      .filter(({ entry, args }) => entry.args.every((a) => !a.required || a.name in args))
      .sort((a, b) => b.score - a.score || a.entry.command.localeCompare(b.entry.command))
      .filter(({ entry, args }) => {
        const key = same(entry.command, args);
        if (kept.has(key)) return false;
        kept.add(key);
        return true;
      })
      .slice(0, limit)
      .map(({ entry, offer, evidence, score, args }) => ({
        plugin: entry.plugin,
        pluginTitle: entry.pluginTitle,
        command: entry.command,
        title: entry.title,
        label: offer?.label ?? entry.label,
        detail: entry.detail,
        args,
        evidence,
        score,
      }))
  );
}
