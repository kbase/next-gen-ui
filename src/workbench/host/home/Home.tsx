import { useState, useSyncExternalStore } from 'react';
import { Chip, SearchBar } from '@kbase/design-system';
import type { Manifest } from '../../../plugins/sdk';
import { usePanelTitle } from '../../../plugins/sdk';
import { makePanel } from '../../core';
import { useDispatch, useLayout, useServices } from '../../react/context';
import { iconFor } from '../icons';
import { routeParams } from '../routes';
import styles from './Home.module.css';

// The launcher as a page: everything installed, searchable. The prompt
// bar completes the same names inline; this is that search given room,
// and the only path to a page-like plugin that does not need its name
// known in advance.
export function HomeDocument() {
  usePanelTitle('Home');
  const { source, preview, prompt: promptBar } = useServices();
  const layout = useLayout();
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  useSyncExternalStore(source.subscribe, source.version, source.version);

  const q = query.trim().toLowerCase();
  const matches = (m: Manifest) =>
    !q ||
    m.title.toLowerCase().includes(q) ||
    m.id.includes(q) ||
    (m.description?.toLowerCase().includes(q) ?? false);
  const listed = source.manifests().filter((m) => m.id !== 'home' && matches(m));
  // An app is a document that names itself completely: no route params to
  // fill, so it can be opened from a list.
  const apps = listed.filter((m) => m.document && routeParams(m.document.route).length === 0);
  const panels = listed.filter((m) => m.navigator);

  const openApp = (m: Manifest) =>
    dispatch({ type: 'open', panel: makePanel(m.id, 'document', {}) });
  // Show where it lives, never pin: a pinned plugin's navigator is
  // focused in its sidebar block, an unpinned one is previewed the way
  // the sidebar's More menu previews it. Pinning is the catalog's job.
  const showPanel = (m: Manifest) => {
    if (layout.sidebar.pinned.includes(m.id)) {
      dispatch({ type: 'open', panel: makePanel(m.id, 'navigator') });
    } else {
      preview.set(m.id);
    }
  };

  return (
    <div className={styles.root}>
      <Tour onFocusPrompt={() => promptBar.focus()} />

      <SearchBar
        className={styles.search}
        value={query}
        onValueChange={setQuery}
        placeholder="Search apps and panels"
        aria-label="Search installed plugins"
      />

      <Section title="Apps" empty="No app matches." items={apps} onPick={openApp} />
      <Section
        title="Panels"
        empty="No panel matches."
        items={panels}
        onPick={showPanel}
        // Beside the description, not instead of it: where a panel
        // already is does not describe what it is.
        note={(m) => (layout.sidebar.pinned.includes(m.id) ? 'In the sidebar' : undefined)}
      />
    </div>
  );
}

// The prototype's own instructions, for someone who has never seen it and
// does not know the vocabulary: no manifests, navigators or documents,
// and nothing named after the code. The one thing worth insisting on is
// that a suggestion is a guess, since it looks exactly like a search
// result and is not one.
function Tour({ onFocusPrompt }: { onFocusPrompt: () => void }) {
  return (
    <section className={styles.tour} aria-labelledby="home-tour">
      <h2 id="home-tour" className="h4">
        What to try
        <Chip color="primary" label="Prototype" />
      </h2>
      <ol className={styles.tourList}>
        <li>
          Type <Key>nifH</Key> in the box at the bottom. Three tools put their hand up — a dataset,
          a job and a gene page. None of them searched for it; each one recognised the kind of thing
          you typed and said what it would do with it. Click one to go there.{' '}
          <button type="button" className={styles.tourLink} onClick={onFocusPrompt}>
            Put the cursor there
          </button>
        </li>
        <li>
          Open Function Junction from the list below. Some tools are full pages like this one;
          others are the small panels down the left. Either way, they are add-ons rather than parts
          of the site.
        </li>
        <li>
          Drag a panel out of the left column into the middle to give it a tab, or drop a tab near
          the edge of another to see two things side by side.
        </li>
        <li>
          Click More at the bottom of the left column to take a quick look at a tool. It shows up in
          a blue dashed frame; drag that frame into the column to keep it, or leave it and it goes
          away when you reload.
        </li>
        <li>
          Open Catalog to see every installed tool and choose which sit in the left column. All of
          them answer what you type; the assistant setting only picks who gets the text when you
          press Enter without choosing a row.
        </li>
        <li>
          Reload the page. Everything comes back where you left it, including the address of
          whatever you were reading. Workbench → Lock layout stops things moving by accident.
        </li>
      </ol>
      <p className={`caption ${styles.tourNote}`}>
        The data is made up and none of it leaves this browser — a working sketch of how the pieces
        fit together, not the pieces themselves.
      </p>
    </section>
  );
}

// Something to type, set off from the sentence. Control names are left in
// plain prose: capitalised, they already read as labels, and a keycap on
// every one of them turns the paragraph into a rash.
function Key({ children }: { children: string }) {
  return <code className={styles.key}>{children}</code>;
}

function Section({
  title,
  empty,
  items,
  onPick,
  note,
}: {
  title: string;
  empty: string;
  items: Manifest[];
  onPick: (m: Manifest) => void;
  note?: (m: Manifest) => string | undefined;
}) {
  return (
    <section className={styles.section} aria-labelledby={`home-${title}`}>
      <h2 id={`home-${title}`} className="h4">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="caption">{empty}</p>
      ) : (
        <ul className={styles.grid}>
          {items.map((m) => {
            const Icon = iconFor(m.icon, m.color);
            const hint = note?.(m);
            return (
              <li key={m.id}>
                <button type="button" className={styles.card} onClick={() => onPick(m)}>
                  <span className={styles.cardIcon} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className={styles.cardTitle}>
                    {m.title}
                    {hint && <Chip color="neutral" label={hint} />}
                  </span>
                  <p className={`caption ${styles.cardDesc}`}>{m.description}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
