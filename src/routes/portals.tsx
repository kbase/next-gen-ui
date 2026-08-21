import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Chip, Frame, SearchBar, Select } from '@kbase/design-system';
import type { ChipColor } from '@kbase/design-system';
import { ArrowUpRight } from '@phosphor-icons/react';

export const Route = createFileRoute('/portals')({
  component: PortalsPage,
  staticData: { title: 'Portal gallery' },
});

/**
 * Portals are served by a different backend on the same origin, so the
 * edge splits this prefix: `/portals` reaches this app, `/portals/<slug>`
 * reaches the portal server. Nothing this app serves can live under the
 * prefix -- hence `public/portal-thumbs/` rather than `public/portals/`.
 */
const PORTAL_BASE = 'https://gen2.kbase.us/portals/';

/** Where questions and concerns go while this is a soft launch. */
const CONTACT_URL = 'https://www.kbase.us/support/';

interface PortalTag {
  label: string;
  color: ChipColor;
}

interface Portal {
  /** Also the thumbnail filename: `public/portal-thumbs/<slug>.svg`. */
  slug: string;
  title: string;
  blurb: string;
  categories: string[];
  tags: PortalTag[];
  funder: string;
  /** Project, User Facility, ... */
  program: string;
  credit: string;
  version: string;
  /** ISO 8601. */
  updated: string;
  /** Only set when the portal ships with caveats. */
  status?: string;
}

// Titles, blurbs, and versions track the app manifests and release pins in
// the KIND*AI repo (`plugins/*.json`, `RELEASES.md`). Versions are the
// cut-plan pins from the `v2026.08.11` release, which is also the `updated`
// date for every entry -- they were cut together.
//
// PLACEHOLDER, pending real metadata: `funder`, `program`, and `credit`.
// The app manifests carry no such fields today (they hold type/id/title/
// description/launch only), so these are our best reading of each app's
// data sources rather than a recorded fact. Confirm before this is shown
// outside a demo.
const PORTALS: readonly Portal[] = [
  {
    slug: 'enigma-strata',
    title: 'ENIGMA Strata',
    blurb:
      'A branded portal over the ENIGMA subsurface lakehouse — geology, hydrology, geochemistry, biogeography, and genomes of the Oak Ridge plume in one cross-linked focus.',
    categories: ['Ecology', 'Atlas'],
    tags: [
      { label: 'Subsurface', color: 'orange' },
      { label: 'Geochemistry', color: 'teal' },
      { label: 'Biogeography', color: 'green' },
    ],
    funder: 'DOE',
    program: 'Project',
    credit: 'ENIGMA SFA · Lawrence Berkeley National Laboratory',
    version: 'v0.3.1',
    updated: '2026-08-11',
  },
  {
    slug: 'function-junction',
    title: 'Function Junction',
    blurb:
      'Paste a protein — id, sequence, gene, or name — and get every line of functional evidence converged on one page, scored for novelty and information density.',
    categories: ['Proteins'],
    tags: [
      { label: 'Proteins', color: 'primary' },
      { label: 'Annotation', color: 'purple' },
      { label: 'Structure', color: 'ocean' },
    ],
    funder: 'DOE',
    program: 'Project',
    credit: 'KBase',
    version: 'v0.1.1',
    updated: '2026-08-11',
  },
  {
    slug: 'diaspora',
    title: 'Diaspora',
    blurb:
      'A microbial-ecology atlas. Walk compendium → cohort → sample → MAG, linking metagenome observations to physicochemistry, geography, and pangenome-resolved function.',
    categories: ['Ecology', 'Atlas'],
    tags: [
      { label: 'Metagenomics', color: 'teal' },
      { label: 'Ecology', color: 'green' },
    ],
    funder: 'DOE',
    program: 'Project',
    credit: 'KBase · Microbe Atlas',
    version: 'v0.1.4',
    updated: '2026-08-11',
  },
  {
    slug: 'genknown',
    title: 'genKnown',
    blurb:
      'A taxonomic telescope. Search any node of the tree of life for a rank-relative evidence report: measured and predicted physiology, ecology, and metabolite exchange.',
    categories: ['Taxonomy'],
    tags: [
      { label: 'Taxonomy', color: 'green' },
      { label: 'Physiology', color: 'teal' },
    ],
    funder: 'DOE',
    program: 'Project',
    credit: 'KBase',
    version: 'v0.1.2',
    updated: '2026-08-11',
    status: 'Tester preview',
  },
  {
    slug: 'plant-terra',
    title: 'Plant Terra',
    blurb:
      'Plant functional genomics with genomes in environmental context — a per-genome dossier spanning comparative genomics, metabolism, variation, and G×E.',
    categories: ['Genomics'],
    tags: [
      { label: 'Plants', color: 'green' },
      { label: 'Genomics', color: 'primary' },
    ],
    funder: 'DOE',
    program: 'User Facility',
    credit: 'JGI Phytozome',
    version: 'v0.1.3',
    updated: '2026-08-11',
  },
  {
    slug: 'fungal-jungle',
    title: 'Fungal Jungle',
    blurb:
      'Per-genome fungal functional genomics: CAZyme repertoire crossed with ecological guild, plus model-organism deep dives, structure, and biogeography.',
    categories: ['Genomics'],
    tags: [
      { label: 'Fungi', color: 'yellow' },
      { label: 'CAZymes', color: 'orange' },
    ],
    funder: 'DOE',
    program: 'User Facility',
    credit: 'JGI MycoCosm · GBIF',
    version: 'v0.5.1',
    updated: '2026-08-11',
  },
  {
    slug: 'genepool',
    title: 'GenePool',
    blurb:
      "You versus the machine. Judge the AI annotator's calls on real proteins to build a certified, trust-weighted competence leaderboard.",
    categories: ['Proteins', 'Benchmarking'],
    tags: [
      { label: 'Benchmarking', color: 'purple' },
      { label: 'Annotation', color: 'primary' },
    ],
    funder: 'DOE',
    program: 'Project',
    credit: 'KBase',
    version: 'v0.1.2',
    updated: '2026-08-11',
  },
];

const ALL = 'all';

// Derived, so adding a portal with a new category cannot leave it
// unreachable behind a filter list nobody updated.
const CATEGORIES = [
  { value: ALL, label: 'All portals' },
  ...[...new Set(PORTALS.flatMap((p) => p.categories))].sort().map((c) => ({ value: c, label: c })),
];

const SORTS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'updated', label: 'Last updated' },
] as const;

type SortValue = (typeof SORTS)[number]['value'];

const UPDATED_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatUpdated(iso: string): string {
  return UPDATED_FMT.format(new Date(`${iso}T00:00:00Z`));
}

function haystack(portal: Portal): string {
  return [
    portal.title,
    portal.blurb,
    portal.credit,
    portal.funder,
    portal.program,
    ...portal.categories,
    ...portal.tags.map((t) => t.label),
  ]
    .join(' ')
    .toLowerCase();
}

function PortalsPage() {
  return (
    <div className="portals">
      <TopBar />

      <main className="portals__main">
        <Hero />
        <Gallery />
        <AboutPortals />
      </main>

      <SiteFooter />
    </div>
  );
}

function TopBar() {
  return (
    <header className="portals__topbar">
      <div className="portals__topbar-inner">
        <span className="portals__brand">
          {/* Two files, not one recoloured by CSS: the wordmark is
              near-black and vanishes on the dark theme, while the marks
              beside it must keep their brand colours. */}
          <img
            className="kbase-logo kbase-logo--light"
            src="/kbase-logo-ref.png"
            alt="KBase"
            width={251}
            height={64}
          />
          <img
            className="kbase-logo kbase-logo--dark"
            src="/kbase-logo-dark.png"
            alt=""
            aria-hidden="true"
            width={251}
            height={64}
          />
        </span>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="portals__hero">
      <h1 className="portals__headline">KBase 2.0 Portal Gallery</h1>
      <p className="portals__lead">
        Discover modern scientific portals built on the KBase ecosystem.
      </p>
    </section>
  );
}

function BetaNotice() {
  return (
    <p className="portals__beta">
      <span className="portals__beta-tag">Beta</span> This gallery is a soft launch. If you have
      questions or concerns about anything here,{' '}
      <a className="link" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">
        contact us
      </a>
      .
    </p>
  );
}

function Gallery() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  const [sort, setSort] = useState<SortValue>('name');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = PORTALS.filter(
      (p) =>
        (category === ALL || p.categories.includes(category)) &&
        (q === '' || haystack(p).includes(q)),
    );
    // localeCompare on the title as the tiebreak, so equal dates -- which
    // is every portal today, all cut in the same release -- still order
    // predictably rather than by array position.
    if (sort === 'updated') {
      return [...filtered].sort(
        (a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title),
      );
    }
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [query, category, sort]);

  return (
    <section className="portals__gallery" aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="sr-only">
        Published portals
      </h2>

      <BetaNotice />

      <div className="portals__controls">
        <SearchBar
          value={query}
          onValueChange={setQuery}
          placeholder="Search portals by name or keyword..."
          className="portals__search"
          aria-label="Search portals"
        />

        {/* Not SegmentedControl: it sizes every segment equally, clips
            with overflow:hidden, and cannot wrap, so seven variable-length
            labels collide at large text sizes. */}
        <div className="portals__filters" role="radiogroup" aria-label="Filter portals by category">
          {CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={option.value === category}
              className={
                option.value === category
                  ? 'portals__filter portals__filter--active'
                  : 'portals__filter'
              }
              onClick={() => setCategory(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="portals__sort">
          {/* `items` lets the closed trigger render the label rather than
              the raw value -- Base UI has not mounted the popup yet. */}
          <Select.Root
            items={SORTS}
            value={sort}
            onValueChange={(value) => value && setSort(value)}
            aria-label="Sort portals"
          >
            <Select.Trigger />
            <Select.Popup>
              {SORTS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Root>
        </div>
      </div>

      <p className="portals__count" role="status">
        {visible.length === PORTALS.length
          ? `${PORTALS.length} portals`
          : `${visible.length} of ${PORTALS.length} portals`}
      </p>

      {visible.length === 0 ? (
        <p className="portals__empty">
          No portals match that search.{' '}
          <button onClick={() => setQuery('')}>Clear the search</button> to see all {PORTALS.length}
          .
        </p>
      ) : (
        <ul className="portals__grid">
          {visible.map((portal) => (
            <li key={portal.slug}>
              <PortalCard portal={portal} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PortalCard({ portal }: { portal: Portal }) {
  return (
    <a
      className="portal-card"
      href={`${PORTAL_BASE}${portal.slug}/`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open the ${portal.title} portal (opens in a new tab)`}
    >
      <Frame padding={0} className="portal-card__frame">
        <img
          className="portal-card__shot"
          src={`/portal-thumbs/${portal.slug}.svg`}
          alt={`Screenshot of the ${portal.title} portal`}
          width={640}
          height={400}
          loading="lazy"
        />

        <div className="portal-card__body">
          <div className="portal-card__title-row">
            <h3 className="h3">{portal.title}</h3>
            <ArrowUpRight size={14} className="portal-card__go" aria-hidden="true" />
          </div>

          <p className="portal-card__blurb">{portal.blurb}</p>

          <div className="portal-card__tags">
            <Chip color="ocean" onWhite>
              {portal.funder}
            </Chip>
            <Chip color="primary" onWhite>
              {portal.program}
            </Chip>
            {portal.tags.map((tag) => (
              <Chip key={tag.label} color={tag.color} onWhite>
                {tag.label}
              </Chip>
            ))}
            {portal.status && (
              <Chip color="yellow" onWhite>
                {portal.status}
              </Chip>
            )}
          </div>

          <p className="portal-card__credit">{portal.credit}</p>
        </div>

        <div className="portal-card__meta">
          <span className="mono-secondary">{portal.version}</span>
          <span aria-hidden="true">&middot;</span>
          <span>Updated {formatUpdated(portal.updated)}</span>
          <span className="portal-card__open">Open portal</span>
        </div>
      </Frame>
    </a>
  );
}

// Portals are apps -- every entry here is `"type": "app"` in KIND*AI's
// plugins/*.json. ("Portal" also names a deliverable kind an
// investigation emits, alongside paper and slides. Different thing.)
function AboutPortals() {
  return (
    <section className="portals__about" aria-labelledby="about-heading">
      <Frame paddingY={9} paddingX={9}>
        <h2 id="about-heading" className="h2">
          About portals
        </h2>
        <p className="portals__about-body">
          A portal is a KBase app that presents one area of science.
        </p>
        <p className="portals__about-body">
          The portals in this gallery cover subsurface geochemistry, fungal and plant genomes,
          protein function, and microbial ecology. Each one is a separate program. KBase starts it
          when you open it and displays it in your browser, where you can search the data, follow
          links between records, and change what is shown.
        </p>
        <p className="portals__about-body">
          Each portal lists its version and the date it was last updated.
        </p>
      </Frame>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="portals__footer">
      <span className="note">
        KBase &middot; a DOE Biological and Environmental Research data platform
      </span>
      <nav className="portals__footer-links">
        <a href="https://www.kbase.us/" target="_blank" rel="noopener noreferrer">
          About KBase
        </a>
      </nav>
    </footer>
  );
}
