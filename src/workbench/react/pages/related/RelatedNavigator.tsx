import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { CartButton, EmptyState, Loader, Tooltip } from '@kbase/design-system';
import type { CartItem } from '../../../../plugins/sdk';
import { qualifyCommand, usePanelTitle } from '../../../../plugins/sdk';
import type { QuerySource, Recommendation } from '../../../core';
import { mergeRecommendations } from '../../../core';
import { pluginHostFor } from '../../../host/pluginHost';
import { PluginMark } from '../../PluginMark';
import { useRun, useServices } from '../../context';
import styles from '../../Workbench.module.css';

// What the rest of the workbench has about what is on screen and what is in
// the cart: every plugin's `relate`, with the recommendation as the unit.
// What is being typed is not here: it is answered with offers, which the
// prompt bar shows.
//
// Two sections in a fixed order, one per source, each headed by what it was
// answered for: the open page's label, the cart. A section is drawn only when
// it has rows or is still waiting for them; nobody opened this pane to put a
// question, so a section with nothing under it is not an answer owed back and
// comes down instead. The pane has a header the reader can see, so when no
// section is drawn the pane says so once. Inside a section the rows hold
// still: a row keeps its place from the moment it appears until nothing
// offers it any more; a new answer adds rows at the end and takes rows away,
// and never re-sorts. The plugin is the mark on the row. What is still being
// asked is one line under the section's rows, never a row. Rows enter and
// leave without animation: a view transition here snapshots the whole
// document, and iPhone Safari drew a blank frame at each snapshot.
//
// A row is a link and an offer. Pressing it runs the command the item's
// `source` names, in the answering plugin; the `+` puts the item in that same
// plugin's cart, which is where it would have landed had the reader added it
// from the plugin's own page. A row whose item is already in the cart shows
// its button pressed, so the press that added it is the press that takes it
// back out.
//
// Under the row's label is why it is there, in a sentence: which plugin, and
// which of the terms in view it answered. It is the row's own line rather than
// a heading over a group of rows, because grouping by term would give a narrow
// pane one Cart heading per kept item.

// The sources this pane reads, in section order.
const SOURCES = ['page', 'cart'] as const satisfies readonly QuerySource[];
type RelatedSource = QuerySource;

// What a source holds, as a person would say it. `mentions` is for a plugin
// whose whole evidence is that words matched words: the atlas knows "soil" as
// a biome, and an ordinary sentence is made of words. The section heading
// already names the page, so neither clause repeats its label.
const BECAUSE: Record<RelatedSource, { has: string; mentions: string }> = {
  page: { has: 'this page is about', mentions: 'this page mentions' },
  cart: { has: 'your cart has', mentions: 'your cart mentions' },
};

// A source as a row names it when the plugin that offered it said nothing
// about why.
const ASKED: Record<RelatedSource, string> = {
  page: 'the open page',
  cart: 'the cart',
};

// The section heading: what the rows under it were answered for.
const HEADING: Record<RelatedSource, (label: string) => string> = {
  page: (label) => label || 'Open page',
  cart: () => 'Cart',
};

// Plugins as a sentence names them: titles, from the manifests.
function listPlugins(ids: readonly string[], titleOf: (id: string) => string): string {
  const names = ids.map(titleOf);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function RelatedNavigator() {
  usePanelTitle('Related');
  const { query, cart, source: index } = useServices();
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);

  // The list is state of this pane rather than a derivation, because its
  // order is history: what appeared first stays first.
  const [rows, setRows] = useState<Recommendation[]>([]);
  const current = useRef(rows);
  useEffect(() => {
    const update = () => {
      const next = mergeRecommendations(
        current.current,
        SOURCES.map((source) => ({ source, state: query.get(source) })),
      );
      current.current = next;
      setRows(next);
    };
    update();
    return query.subscribe(update);
  }, [query]);

  const shown = rows.filter((r) => !query.dismissed(r.id));
  // A row sits in the section of its first offer; the count on the row says
  // when others offer it too.
  //
  // `pool` is the terms the source was last asked about: written when the
  // question is put, before the settle, and emptied when the source has
  // nothing to ask. It is the whole test for whether a section exists, so a
  // section outlives a round of answers. `pending` is the plugins asked the
  // current question that have not answered it: the one place "nobody has
  // anything" and "nobody has answered yet" can be told apart, so it is what
  // holds a section up and what the waiting line names. The runner's budget
  // (`loading`) is not read here: it would take a slow plugin's section down
  // and draw the empty state, and the answer would then replace it.
  const sections = SOURCES.map((source) => {
    const state = query.get(source);
    return {
      source,
      asked: state.pool.length > 0,
      label: HEADING[source](state.label),
      // Whether anything is in question about which term a row answers. One
      // term in the pool and the heading already names the only candidate.
      manyAsked: state.pool.length > 1,
      rows: shown.filter((r) => r.offeredBy[0].source === source),
      pending: state.pending,
    };
  }).filter((s) => s.asked);

  // A section with nothing under it is not drawn at all, and when that is
  // every section the pane says so once. Nothing here was asked for: no one
  // opened this pane to put a question, so absence is not an answer owed back
  // — it is a shelf with nothing on it, and shelves with nothing on them come
  // down. The distinction that matters is the pane itself, which has a header
  // the reader can see and so cannot be blank.
  const drawn = sections.filter((s) => s.rows.length > 0 || s.pending.length > 0);
  if (drawn.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<MagnifyingGlass size={32} />}
        title="Nothing to show"
        description="No other plugin has anything about the open page or the cart."
      />
    );
  }

  return (
    <div className={styles.related}>
      {drawn.map((s) => (
        <div key={s.source}>
          <p className={styles.relatedFrom}>{s.label}</p>
          {s.rows.length > 0 && (
            <ul className={styles.relatedList}>
              {s.rows.map((row) => (
                <RelatedRow key={row.id} row={row} manyAsked={s.manyAsked} />
              ))}
            </ul>
          )}
          {s.pending.length > 0 && (
            // The line carries the announcement; the loader beside it is
            // decoration, and a label on it would say the same words twice.
            // It names whose rows are still to come, by title.
            <p className={`note ${styles.relatedLine}`} role="status">
              <Loader size={14} />
              <span>
                {`Nothing yet from ${listPlugins(s.pending, (id) => index.manifest(id)?.title ?? id)}…`}
              </span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// A term in the reader's own words. A term the cart carries is named by the
// item carrying it, so `uniprot:P11558` is the P11558 on the tile the reader
// put there; anything else loses its namespace, which is the plugins'
// spelling of a thing and not a reader's.
function termLabel(term: string, carried: readonly CartItem[]): string {
  const item = carried.find((i) => i.terms?.includes(term));
  if (item) return item.subject ?? item.name;
  const at = term.indexOf(':');
  return at > 0 ? term.slice(at + 1) : term;
}

// The terms of one offer as a line thirty characters wide can hold them: past
// two, the count is the part that still reads.
function listTerms(labels: string[]): string {
  return labels.length <= 2 ? labels.join(' and ') : `${labels[0]} and ${labels.length - 1} others`;
}

// One offer as a sentence: who answered, and which of the terms in view they
// answered. A plugin that gave no evidence says where it was asked and no
// more, which is everything the row knows about it.
function clause(
  offer: Recommendation['offeredBy'][number],
  title: string,
  carried: readonly CartItem[],
): string {
  const terms = [...new Set(offer.answers.map((a) => termLabel(a.term, carried)))];
  if (terms.length === 0) return `${title}, from ${ASKED[offer.source]}`;
  const say = offer.answers.every((a) => a.kind === 'name') ? 'mentions' : 'has';
  return `${title}, because ${BECAUSE[offer.source][say]} ${listTerms(terms)}`;
}

// What the `+` adds: the item as the plugin gave it, without why it gave it.
// `answers` is the reason it was offered for a question, and the cart is not
// a question — left on, it would sit on the tile as a stale reason until the
// reload that drops it, the stored shape having no such field (core/cart.ts).
function withoutEvidence(item: CartItem): CartItem {
  const thing = { ...item };
  delete thing.answers;
  return thing;
}

function RelatedRow({ row, manyAsked }: { row: Recommendation; manyAsked: boolean }) {
  const services = useServices();
  const { query, source: index } = services;
  const { item } = row;
  const first = row.offeredBy[0];
  const manifest = index.manifest(first.plugin);
  const title = manifest?.title ?? first.plugin;
  const run = useRun();
  const from = item.source;
  // Pressing the row runs the command that makes the thing, as the user: the
  // row is a button of theirs, not the answering plugin acting for them.
  const open = from
    ? () => void run(qualifyCommand(from.command, first.plugin), from.args)
    : undefined;
  // The cart of the plugin that answered, not this pane's. An item added here
  // is the item that plugin would have added: same stamp, same slice, so the
  // button's pressed state is about the row it sits on.
  const cart = pluginHostFor(services, first.plugin).cart;
  // Read from the whole cart, not this plugin's slice: the term a row answers
  // was put in view by whichever item carries it.
  const carried = services.cart.items();
  const reasons = row.offeredBy.map((o) =>
    clause(o, index.manifest(o.plugin)?.title ?? o.plugin, carried),
  );
  // The reason names which term the row answers and which plugin answered. It
  // earns its line only when one of those is in question: more than one term
  // was asked about, or more than one plugin offered the row. A section asked
  // about a single term, answered by the one plugin whose mark is already on
  // the row, would spend a third line saying what two lines above it say.
  const why = manyAsked || reasons.length > 1 ? reasons.join('; ') : '';
  const label = (
    <span className={styles.relatedLabel}>
      <span className={styles.relatedName}>{item.subject ?? item.name}</span>
      {item.summary && <span className={styles.relatedDetail}>{item.summary}</span>}
      {why && <span className={styles.relatedWhy}>{why}</span>}
    </span>
  );
  const mark = (
    <PluginMark
      icon={manifest?.icon}
      color={manifest?.color}
      size={14}
      className={styles.relatedMark}
      aria-hidden="true"
    />
  );

  return (
    <li className={styles.relatedRow}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            open ? (
              <button type="button" className={styles.relatedOpen} onClick={open}>
                {mark}
                {label}
              </button>
            ) : (
              <span className={styles.relatedOpen}>
                {mark}
                {label}
              </span>
            )
          }
        />
        {/* Why the row is there is on the row now, so the tooltip says what
            the label had no room for: the item's full name, and what pressing
            it does. */}
        <Tooltip.Popup side="right">
          {open ? `${item.name}. Open in ${title}.` : item.name}
        </Tooltip.Popup>
      </Tooltip.Root>

      {row.offeredBy.length > 1 && (
        <span
          className={styles.relatedOffers}
          aria-label={`Suggested by ${row.offeredBy.length} plugins`}
        >
          {`×${row.offeredBy.length}`}
        </span>
      )}

      {/* The design system's control rather than the SDK's, which reads the
          cart of the plugin it is rendered in — here the pane's own, which is
          not the cart this row adds to. */}
      <CartButton
        pressed={cart.has(item.id)}
        aria-label={`Add ${item.subject ?? item.name} to the cart`}
        onPressedChange={(next) => (next ? cart.add(withoutEvidence(item)) : cart.remove(item.id))}
      />

      <button
        type="button"
        className={styles.relatedDismiss}
        aria-label={`Dismiss ${item.name}`}
        onClick={() => query.dismiss(item.id)}
      >
        <X size={11} aria-hidden="true" />
      </button>
    </li>
  );
}
