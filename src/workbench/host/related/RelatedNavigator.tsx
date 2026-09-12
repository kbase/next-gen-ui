import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { EmptyState, Loader, Tooltip } from '@kbase/design-system';
import { CartButton, qualifyCommand, usePanelTitle } from '../../../plugins/sdk';
import type { QuerySource, Recommendation } from '../../core';
import { mergeRecommendations } from '../../core';
import { openRoute } from '../open';
import { PluginMark } from '../PluginMark';
import { useRun, useServices } from '../../react/context';
import styles from '../../react/Workbench.module.css';

// What the rest of the workbench has about what is on screen and what is in
// the cart: every plugin's `relate`, with the recommendation as the unit.
// What is being typed is not here: it is answered with offers, which the
// prompt bar shows.
//
// Two sections in a fixed order, one per source, each headed by what it was
// answered for: the open page's label, the cart. A section stands for a
// question rather than for its answers, so it appears when the question is
// put and stays until the source withdraws it; a page that reports its terms
// a second after its tab opens has no section until then, and never loses
// one because an answer came back empty. Inside a section the rows hold
// still: a row keeps its place from the moment it appears until nothing
// offers it any more; a new answer adds rows at the end and takes rows away,
// and never re-sorts. The plugin is the mark on the row. What is still being
// asked is one line under the section's rows, never a row. Rows enter and
// leave without animation: a view transition here snapshots the whole
// document, and iPhone Safari drew a blank frame at each snapshot.
//
// A row is a link and an offer. Pressing it opens the item's `source` in the
// answering plugin; the `+` puts the item in the cart. An item already in the
// cart is not shown: the reader has it.

// The sources this pane reads, in section order.
const SOURCES = ['page', 'cart'] as const satisfies readonly QuerySource[];
type RelatedSource = QuerySource;

const FROM: Record<RelatedSource, (label: string) => string> = {
  page: (label) => `the open page (${label})`,
  cart: (label) => `the cart (${label})`,
};

// A source as the line under its heading names it.
const ASKED: Record<RelatedSource, string> = {
  page: 'the open page',
  cart: 'the cart',
};

// The section heading: what the rows under it were answered for.
const HEADING: Record<RelatedSource, (label: string) => string> = {
  page: (label) => label || 'Open page',
  cart: () => 'Cart',
};

export function RelatedNavigator() {
  usePanelTitle('Related');
  const { query, cart } = useServices();
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

  const shown = rows.filter((r) => !cart.has(r.id) && !query.dismissed(r.id));
  // A row sits in the section of its first offer; the count on the row says
  // when others offer it too.
  //
  // `pool` is the terms the source was last asked about: written when the
  // question is put, before the settle, and emptied when the source has
  // nothing to ask. It is the whole test for whether a section exists, so a
  // section outlives a round of answers. `loading` runs from the same moment
  // until every plugin has answered or the budget ends the waiting; an answer
  // after that still adds its rows.
  const sections = SOURCES.map((source) => {
    const state = query.get(source);
    return {
      source,
      asked: state.pool.length > 0,
      label: HEADING[source](state.label),
      rows: shown.filter((r) => r.offeredBy[0].source === source),
      asking: state.loading,
    };
  }).filter((s) => s.asked);

  // Neither source has terms. Said as the fact it is: the pane cannot tell an
  // open page with nothing to ask about from one that has not reported yet,
  // and either way no plugin has been asked anything.
  if (sections.length === 0) {
    return (
      <EmptyState
        icon={<MagnifyingGlass size={32} />}
        title="Nothing to ask about"
        description="No terms from the open page or the cart."
      />
    );
  }

  return (
    <div className={styles.related}>
      {sections.map((s) => (
        <div key={s.source}>
          <p className={styles.relatedFrom}>{s.label}</p>
          {s.rows.length > 0 && (
            <ul className={styles.relatedList}>
              {s.rows.map((row) => (
                <RelatedRow key={row.id} row={row} />
              ))}
            </ul>
          )}
          {s.asking ? (
            // The line carries the announcement; the loader beside it is
            // decoration, and a label on it would say the same words twice.
            <p className={`note ${styles.relatedLine}`} role="status">
              <Loader size={14} />
              <span>Asking the other plugins…</span>
            </p>
          ) : (
            s.rows.length === 0 && (
              <p
                className={`note ${styles.relatedLine}`}
              >{`Nothing offered for ${ASKED[s.source]}.`}</p>
            )
          )}
        </div>
      ))}
    </div>
  );
}

function RelatedRow({ row }: { row: Recommendation }) {
  const services = useServices();
  const { query, cart, source: index } = services;
  const { item } = row;
  const first = row.offeredBy[0];
  const manifest = index.manifest(first.plugin);
  const title = manifest?.title ?? first.plugin;
  const run = useRun();
  const from = item.source;
  // Pressing the row goes to the thing: its path, or the command that makes it.
  const open =
    from && 'path' in from
      ? () => void openRoute(services, first.plugin, from.path)
      : from && 'command' in from
        ? () => void run(qualifyCommand(from.command, first.plugin), from.args)
        : undefined;
  const provenance = row.offeredBy
    .map(
      (o) =>
        `${index.manifest(o.plugin)?.title ?? o.plugin} from ${FROM[o.source](query.get(o.source).label)}`,
    )
    .join('; ');
  const label = (
    <span className={styles.relatedLabel}>
      <span className={styles.relatedName}>{item.subject ?? item.name}</span>
      {item.summary && <span className={styles.relatedDetail}>{item.summary}</span>}
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
        <Tooltip.Popup side="right">
          {open
            ? `Open in ${title}. Offered by ${provenance}.`
            : `${item.name}. Offered by ${provenance}.`}
        </Tooltip.Popup>
      </Tooltip.Root>

      {row.offeredBy.length > 1 && (
        <span className={styles.relatedOffers} aria-label={`Offered ${row.offeredBy.length} times`}>
          {`×${row.offeredBy.length}`}
        </span>
      )}

      {/* The same control the plugins draw on their own pages. The item is
          stamped with the first answering plugin, the same way that plugin's
          own `cart.add` would stamp it. */}
      <CartButton
        id={item.id}
        subject={item.subject ?? item.name}
        onAdd={() => cart.add({ ...item, plugin: first.plugin, addedAt: Date.now() })}
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
