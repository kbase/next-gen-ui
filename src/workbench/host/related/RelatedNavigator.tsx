import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { X } from '@phosphor-icons/react';
import { Loader, Tooltip } from '@kbase/design-system';
import { CartButton, qualifyCommand, usePanelTitle } from '../../../plugins/sdk';
import type { QuerySource, Recommendation } from '../../core';
import { mergeRecommendations } from '../../core';
import { openRoute } from '../open';
import { PluginMark } from '../PluginMark';
import { useRun, useServices } from '../../react/context';
import styles from '../../react/Workbench.module.css';

// What the rest of the workbench has about what is on screen and what is in
// the cart: every plugin's `recommend.cartItems`, with the recommendation as
// the unit. What is being typed is not here: its answers are the prompt
// bar's offers.
//
// Two groups in a fixed order, one per source, each headed by what it was
// answered for: the open page's label, the cart. A group exists while it
// has rows or an answer on the way, and never moves. Inside a group the
// rows hold still: a row keeps its place from the moment it appears until
// nothing offers it any more; a new answer adds rows at the end and takes
// rows away, and never re-sorts. The plugin is the mark on the row. What is
// still being asked is one line under the group's rows, never a row. Rows
// enter and leave without animation: a view transition here snapshots the
// whole document, and iPhone Safari drew a blank frame at each snapshot.
//
// A row is a link and an offer. Pressing it opens the item's `source` in the
// answering plugin; the `+` puts the item in the cart. An item already in the
// cart is not shown: the reader has it.

// The sources this pane reads, in group order.
const SOURCES = ['page', 'cart'] as const satisfies readonly QuerySource[];
type RelatedSource = (typeof SOURCES)[number];

const FROM: Record<RelatedSource, (label: string) => string> = {
  page: (label) => `the open page (${label})`,
  cart: (label) => `the cart (${label})`,
};

// A source as the empty line names it.
const ASKED: Record<RelatedSource, string> = {
  page: 'the open page',
  cart: 'the cart',
};

// The group heading: what the rows under it were answered for.
const HEADING: Record<RelatedSource, (label: string) => string> = {
  page: (label) => label || 'Open page',
  cart: () => 'Cart',
};

// How long the pane stays blank before saying nothing is related.
const QUIET_MS = 1500;

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
  // A row sits in the group of its first offer; the count on the row says
  // when others offer it too. A source is asking from the moment it is set,
  // before the settle names who is being asked.
  const groups = SOURCES.map((source) => {
    const state = query.get(source);
    return {
      source,
      label: HEADING[source](state.label),
      rows: shown.filter((r) => r.offeredBy[0].source === source),
      pending: state.pending,
      asking: state.loading || state.pending.length > 0,
    };
  }).filter((g) => g.rows.length > 0 || g.asking);

  // "Nothing related" only once the pane has been empty and quiet for a
  // moment: rows leave and arrive a beat apart, and the message in between
  // read as a flash.
  const empty = groups.length === 0;
  // Each time the pane becomes empty is a run; the message shows once the
  // current run has lasted a while: a framed page posts its terms a second
  // or two after its tab opens, and the pane cannot know they are coming.
  // (The previous-render pattern: a state set during render for a value
  // derived from the last one.)
  const [prevEmpty, setPrevEmpty] = useState(empty);
  const [run, setRun] = useState(0);
  if (prevEmpty !== empty) {
    setPrevEmpty(empty);
    if (empty) setRun(run + 1);
  }
  const [settledRun, setSettledRun] = useState(-1);
  useEffect(() => {
    if (!empty) return;
    const t = window.setTimeout(() => setSettledRun(run), QUIET_MS);
    return () => window.clearTimeout(t);
  }, [empty, run]);
  const settledEmpty = empty && settledRun === run;

  // The pane's empty line states why it is empty: nothing was asked, or
  // the plugins were asked and offered nothing. It holds its line while the
  // quiet period runs, so the words arrive without a shift.
  if (empty) {
    const asked = SOURCES.filter((source) => query.get(source).pool.length > 0);
    const line =
      asked.length === 0
        ? 'No page is open and the cart is empty.'
        : `No plugin offers anything for ${asked.map((s) => ASKED[s]).join(' or ')}.`;
    return <p className={`caption ${styles.relatedEmpty}`}>{settledEmpty && line}</p>;
  }

  return (
    <div className={styles.related}>
      {groups.map((g) => (
        <div key={g.source} className={styles.relatedSection}>
          <p className={styles.relatedFrom}>{g.label}</p>
          {g.rows.length > 0 ? (
            <ul className={styles.relatedList}>
              {g.rows.map((row) => (
                <RelatedRow key={row.id} row={row} />
              ))}
            </ul>
          ) : (
            <div
              className={styles.relatedSkeleton}
              aria-label="Asking the other plugins"
              role="status"
            >
              <span />
              <span />
              <span />
            </div>
          )}
          {g.rows.length > 0 && g.pending.length > 0 && <Activity plugins={g.pending} />}
        </div>
      ))}
    </div>
  );
}

function Activity({ plugins }: { plugins: string[] }) {
  const { source: index } = useServices();
  const names = plugins.map((p) => index.manifest(p)?.title ?? p).join(', ');
  return (
    <p className={styles.relatedActivity} role="status">
      <Loader size={14} label={`Asking ${names}`} />
      <span>{`Asking ${names}…`}</span>
    </p>
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
        `${index.manifest(o.plugin)?.title ?? o.plugin} from ${FROM[o.source as RelatedSource](query.get(o.source).label)}`,
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
