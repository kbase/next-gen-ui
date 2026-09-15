import type { CartItem, Match, MatchKind } from '@kbase/plugin-sdk';
import type { QuerySource, SourceState } from './query';

// The Related pane's list, with the recommendation as the unit.
//
// Every source's answers name items; the same item offered by two plugins
// or from two sources is one row whose provenance grew. The list's order is
// the order rows first appeared, so a new round of answers can add rows at
// the end and take rows away, and never moves one the reader already has.
// A row leaves only when no source that is still open offers it: while a
// source is being asked again, what it offered last time stays.

// One plugin putting one item forward from one source. Not an SDK `Offer`,
// which is a command volunteered for typed text: this is a thing volunteered
// for the terms a page or the cart carries, and it is the row's provenance
// rather than something the reader can press.
export interface ItemOffer {
  plugin: string;
  source: QuerySource;
  // The terms this plugin's item answered, as that plugin gave them. Held per
  // offer rather than per row because two plugins answer the same id from
  // different terms — Function Junction for the protein the page names,
  // Diaspora for the taxon in the cart — and a row that kept one set would
  // say one of them was the other's reason.
  answers: Match[];
}

export interface Recommendation {
  id: string;
  item: CartItem;
  // Who offers it, from which source and for which terms, first offer first.
  offeredBy: ItemOffer[];
}

// How much a plugin's account of a term claims, strongest first: it holds the
// thing, it recognised an identifier it serves, words matched words. The
// order the bundled ranker weighs them in (plugins/local/intent/rank.ts).
const STRENGTH: Record<MatchKind, number> = { record: 2, identifier: 1, name: 0 };

// Everything one plugin's item is known to answer, once each, in the order the
// terms were first named. The same id comes back with different evidence
// twice: from two items in one round, which `mergeRecommendations` folds into
// one offer, and from two rounds about a pool that grew, which the query
// runner folds into one item (host/query/runner.ts). Both are the plugin
// answering about one thing under terms it was asked about separately, and a
// row that kept one set would name half the reason it is there. A term named
// twice keeps the stronger account: a later round cannot weaken to `name`
// what an earlier one found in a record, and a plugin that first matched a
// label and then found the thing in its records is believed the second time.
export function unionAnswers(first: readonly Match[] = [], second: readonly Match[] = []): Match[] {
  const answers = [...first];
  for (const match of second) {
    const at = answers.findIndex((a) => a.term === match.term);
    if (at === -1) answers.push(match);
    else if (STRENGTH[match.kind] > STRENGTH[answers[at].kind]) answers[at] = match;
  }
  return answers;
}

export function mergeRecommendations(
  previous: readonly Recommendation[],
  sources: readonly { source: QuerySource; state: SourceState }[],
): Recommendation[] {
  const offered = new Map<string, Recommendation>();
  for (const { source, state } of sources) {
    for (const answer of state.answers) {
      for (const item of answer.items) {
        const row = offered.get(item.id) ?? { id: item.id, item, offeredBy: [] };
        const already = row.offeredBy.find(
          (o) => o.plugin === answer.plugin && o.source === source,
        );
        const answers = item.answers ?? [];
        // One plugin answering one source twice with the same id — two terms
        // it resolved separately — is one offer for both terms.
        if (already) already.answers = unionAnswers(already.answers, answers);
        else row.offeredBy.push({ plugin: answer.plugin, source, answers: [...answers] });
        offered.set(item.id, row);
      }
    }
  }
  // A source that is still asking has not withdrawn anything yet.
  const open = new Set(
    sources.filter(({ state }) => state.pending.length > 0).map(({ source }) => source),
  );
  const kept: Recommendation[] = [];
  const seen = new Set<string>();
  for (const prev of previous) {
    const now = offered.get(prev.id);
    if (now) {
      kept.push(now);
    } else if (prev.offeredBy.some((o) => open.has(o.source))) {
      kept.push(prev);
    } else {
      continue;
    }
    seen.add(prev.id);
  }
  for (const row of offered.values()) if (!seen.has(row.id)) kept.push(row);
  return kept;
}
