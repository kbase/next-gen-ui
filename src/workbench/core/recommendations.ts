import type { CartItem } from '../../plugins/sdk';
import type { QuerySource, SourceState } from './query';

// The Related pane's list, with the recommendation as the unit.
//
// Every source's answers name items; the same item offered by two plugins
// or from two sources is one row whose provenance grew. The list's order is
// the order rows first appeared, so a new round of answers can add rows at
// the end and take rows away, and never moves one the reader already has.
// A row leaves only when no source that is still open offers it: while a
// source is being asked again, what it offered last time stays.

export interface Offer {
  plugin: string;
  source: QuerySource;
}

export interface Recommendation {
  id: string;
  item: CartItem;
  // Who offers it and from which source, first offer first.
  offeredBy: Offer[];
}

export function mergeRecommendations(
  previous: readonly Recommendation[],
  sources: readonly { source: QuerySource; state: SourceState }[],
): Recommendation[] {
  const offered = new Map<string, Recommendation>();
  for (const { source, state } of sources) {
    for (const answer of state.answers) {
      for (const item of answer.cartItems) {
        const row = offered.get(item.id) ?? { id: item.id, item, offeredBy: [] };
        if (!row.offeredBy.some((o) => o.plugin === answer.plugin && o.source === source)) {
          row.offeredBy.push({ plugin: answer.plugin, source });
        }
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
