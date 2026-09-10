import { useState, useSyncExternalStore } from 'react';
import { Button, Chip, SearchBar } from '@kbase/design-system';
import { Code, Gear } from '@phosphor-icons/react';
import type { Manifest } from '../../../plugins/sdk';
import { qualifyCommand, usePanelTitle } from '../../../plugins/sdk';
import { useLayout, useRun, useServices } from '../../react/context';
import { iconFor } from '../icons';
import { openPane, openRoute } from '../open';
import { isApp } from './apps';
import styles from './Home.module.css';

// The launcher as a page: everything installed, searchable. The prompt
// bar completes the same names inline; this is that search given room,
// and the only path to a page-like plugin that does not need its name
// known in advance.
export function HomeDocument() {
  usePanelTitle('Home');
  const services = useServices();
  const { source, preview, prompt: promptBar } = services;
  const layout = useLayout();
  const run = useRun();
  const [query, setQuery] = useState('');
  useSyncExternalStore(source.subscribe, source.version, source.version);

  const q = query.trim().toLowerCase();
  const matches = (m: Manifest) =>
    !q ||
    m.title.toLowerCase().includes(q) ||
    m.id.includes(q) ||
    (m.description?.toLowerCase().includes(q) ?? false);
  const listed = source
    .manifests()
    .filter((m) => m.id !== 'home' && m.id !== 'catalog' && m.id !== 'docs' && matches(m));
  const apps = listed.filter(isApp);
  const panels = listed.filter((m) => source.has(m.id, 'pane'));

  const openApp = (m: Manifest) =>
    void run(qualifyCommand(m.launcher!.command, m.id), m.launcher!.args);
  // Settings is installed like anything else, but it is not listed here: it is
  // the host's own page rather than something a user chose to install, and a
  // reader looking for it is looking for a link, not a search result.
  const openSettings = () => void openRoute(services, 'catalog', '/');
  // Beside Settings for the same reason: the host's own pages, reached by a
  // link rather than found in a search over what is installed.
  const openDocs = () => void openRoute(services, 'docs', '/');
  // Show where it lives, never pin: a pinned plugin's pane is focused in
  // its sidebar block, an unpinned one is previewed the way the sidebar's
  // More menu previews it. Pinning is the catalog's job.
  const showPanel = (m: Manifest) => {
    if (layout.sidebar.pinned.includes(m.id)) openPane(services, m.id);
    else preview.set(m.id);
  };

  return (
    <div className={styles.root}>
      <div className={styles.find}>
        <SearchBar
          className={styles.search}
          value={query}
          onValueChange={setQuery}
          placeholder="Search apps and panels"
          aria-label="Search installed plugins"
        />
        <Button variant="ghost" size="sm" quiet onClick={openSettings}>
          <Gear size={14} aria-hidden="true" />
          Settings
        </Button>
        <Button variant="ghost" size="sm" quiet onClick={openDocs}>
          <Code size={14} aria-hidden="true" />
          Plugin developer documentation
        </Button>
      </div>

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

      <Tour onFocusPrompt={() => promptBar.focus()} />
    </div>
  );
}

// The prototype's own instructions, for someone who has never seen it and does
// not know the vocabulary. A tour, not an explainer: every line is a thing to
// do and what appears; no mechanism, nothing named after the code. It follows
// the lists, which are what the page is for. P11558 is the example because
// all three real apps answer for it.
function Tour({ onFocusPrompt }: { onFocusPrompt: () => void }) {
  return (
    <section className={styles.tour} aria-labelledby="home-tour">
      <header className={styles.tourHead}>
        <h2 id="home-tour" className="h4">
          What to try
        </h2>
        <Chip color="primary" label="Prototype" />
      </header>

      <ol className={styles.journey}>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            1
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Ask for a protein</h3>
            <p className={styles.stepText}>
              Click the box at the bottom and type <Key>P11558</Key>. A short list opens above it.
              The top row sends the text to KOROS; below it, Function Junction offers a dossier.
              Press the Function Junction row.{' '}
              <button type="button" className={styles.tourLink} onClick={onFocusPrompt}>
                Put the cursor there
              </button>
            </p>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            2
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Read the dossier</h3>
            <p className={styles.stepText}>
              A tab opens in the middle. It takes a minute to build, and cards fill in as their
              evidence arrives: this is methyl-coenzyme M reductase, the enzyme that makes methane,
              from <i>Methanothermobacter marburgensis</i>.
            </p>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            3
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>See what the other tools know</h3>
            <p className={styles.stepText}>
              While the dossier builds, watch the Related panel at the bottom left. Two rows arrive:
              genKnown, with the organism&apos;s place in the tree of life, and Diaspora, with the
              environments its family is found in. Press the genKnown row: the organism opens in a
              second tab beside the dossier. Press Diaspora&apos;s: a third tab opens on the 3,308
              samples that carry it, mapped.
            </p>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            4
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Keep what matters</h3>
            <p className={styles.stepText}>
              Every card in the dossier, and every Related row, has an Add to cart button. Press a
              few. They collect in the cart under the box, and the Related panel starts answering
              for what you kept as well as for the page you are on.
            </p>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            5
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Send it to KOROS</h3>
            <p className={styles.stepText}>
              Press New question in Shortcuts at the top left. A blank page opens and the box now
              points at it. Type a question and press Enter. What you kept goes with it, and the
              page shows your question and the items. KOROS here is a mock-up: it answers with a
              placeholder, marks the arc as needing you, and Approve plan moves it to the next
              stage. The real KOROS would frame the question, search prior work, and hand you a plan
              to approve at this point.
            </p>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            6
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle}>Come back to it</h3>
            <p className={styles.stepText}>
              Reload the page. The tabs, the cart and the arc are where you left them, and the KOROS
              panel on the left lists every arc and marks the ones waiting on you.
            </p>
          </div>
        </li>
      </ol>

      <div className={styles.tourMore}>
        <h3 className={styles.tourMoreTitle}>Also try</h3>
        <ul className={styles.tourMoreList}>
          <li>
            Typing a place instead of a protein: <Key>marine biome</Key>, <Key>soil samples</Key>.
          </li>
          <li>
            Typing a taxon: <Key>Escherichia coli</Key>. genKnown offers it; Diaspora answers for
            it.
          </li>
          <li>
            <Key>/</Key> and a command name. Tab completes it, and the hint under the box shows what
            it takes.
          </li>
          <li>
            Dragging a panel from the left column into the middle, or a tab next to another tab.
          </li>
          <li>Settings, for which panels sit on the left and which assistant answers you.</li>
        </ul>
      </div>

      <p className={`caption ${styles.tourNote}`}>
        KOROS, Jobs and Data are mock-ups. Function Junction, genKnown and Diaspora are the real
        apps, reading the KBase lakehouse.
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
