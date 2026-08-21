import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Chip, Frame, SearchBar, Select } from '@kbase/design-system';
import type { ChipColor } from '@kbase/design-system';
import { ArrowUpRight } from '@phosphor-icons/react';

export const Route = createFileRoute('/portals')({
  component: PortalsPage,
  staticData: { title: 'Portal gallery' },
});

// A different backend serves /portals/<slug>, so nothing this app serves
// may live under that prefix (hence public/portal-thumbs/).
const PORTAL_BASE = 'https://gen2.kbase.us/portals/';

const CONTACT_URL = 'https://www.kbase.us/support/';

interface PortalFacet {
  label: string;
  color: ChipColor;
}

// Card chips and filter pills both come from here, so every chip filters.
const FACETS = {
  genomes: { label: 'Genomes', color: 'primary' },
  ecology: { label: 'Ecology', color: 'green' },
  environment: { label: 'Environment', color: 'teal' },
  proteins: { label: 'Proteins', color: 'purple' },
} as const satisfies Record<string, PortalFacet>;

interface Portal {
  /** Also the thumbnail filename: `public/portal-thumbs/<slug>.svg`. */
  slug: string;
  title: string;
  blurb: string;
  facets: PortalFacet[];
  /** Not filterable; rendered as plain text so it reads as prose. */
  topics: string[];
  credit: string;
  version: string;
  /** ISO 8601. */
  updated: string;
  /** Not rendered: the portal discloses its own caveats. */
  status?: string;
}

// Only portals cleared for public display belong here; the bundle is public,
// so an uncleared entry is readable whether or not it is rendered.
// Order is the `default` sort.
// Titles, blurbs and versions come from KIND*AI (`plugins/*.json`,
// `RELEASES.md` v2026.08.11). `credit` does NOT -- it is a placeholder,
// unverified, and needs real values before this is shown outside a demo.
const PORTALS: readonly Portal[] = [
  {
    slug: 'genknown',
    title: 'genKnown',
    blurb:
      'A taxonomic telescope. Search any node of the tree of life for a rank-relative evidence report: measured and predicted physiology, ecology, and metabolite exchange.',
    facets: [FACETS.genomes, FACETS.ecology],
    topics: ['Taxonomy', 'Physiology', 'Metabolite exchange'],
    credit: 'KBase',
    version: 'v0.1.2',
    updated: '2026-08-11',
    status: 'Tester preview',
  },
  {
    slug: 'diaspora',
    title: 'Diaspora',
    blurb:
      'A microbial-ecology atlas. Walk compendium → cohort → sample → MAG, linking metagenome observations to physicochemistry, geography, and pangenome-resolved function.',
    facets: [FACETS.ecology, FACETS.environment],
    topics: ['Metagenomics', 'Biogeography', 'Pangenomes'],
    credit: 'KBase · Microbe Atlas',
    version: 'v0.1.4',
    updated: '2026-08-11',
  },
  {
    slug: 'plant-terra',
    title: 'Plant Terra',
    blurb:
      'Plant functional genomics with genomes in environmental context — a per-genome dossier spanning comparative genomics, metabolism, variation, and G×E.',
    facets: [FACETS.genomes, FACETS.environment],
    topics: ['Plants', 'Metabolism', 'G×E'],
    credit: 'JGI Phytozome',
    version: 'v0.1.3',
    updated: '2026-08-11',
  },
  {
    slug: 'fungal-jungle',
    title: 'Fungal Jungle',
    blurb:
      'Per-genome fungal functional genomics: CAZyme repertoire crossed with ecological guild, plus model-organism deep dives, structure, and biogeography.',
    facets: [FACETS.genomes, FACETS.ecology, FACETS.proteins],
    topics: ['Fungi', 'CAZymes', 'Structure'],
    credit: 'JGI MycoCosm · GBIF',
    version: 'v0.5.1',
    updated: '2026-08-11',
  },
  {
    slug: 'function-junction',
    title: 'Function Junction',
    blurb:
      'Paste a protein — id, sequence, gene, or name — and get every line of functional evidence converged on one page, scored for novelty and information density.',
    facets: [FACETS.proteins],
    topics: ['Annotation', 'Structure', 'Homologs'],
    credit: 'KBase',
    version: 'v0.1.1',
    updated: '2026-08-11',
  },
];

const ALL = 'all';

const FILTERS = [
  { value: ALL, label: 'All portals', color: null as ChipColor | null },
  ...Object.values(FACETS)
    .filter((f) => PORTALS.some((p) => p.facets.includes(f)))
    .map((f) => ({ value: f.label, label: f.label, color: f.color as ChipColor | null })),
];

const SORTS = [
  { value: 'default', label: 'Default' },
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
    ...portal.facets.map((f) => f.label),
    ...portal.topics,
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
          {/* Two files: the wordmark is near-black, the marks beside it are
              brand colours, so no single file or filter serves both themes. */}
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
  const [sort, setSort] = useState<SortValue>('default');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = PORTALS.filter(
      (p) =>
        (category === ALL || p.facets.some((f) => f.label === category)) &&
        (q === '' || haystack(p).includes(q)),
    );
    if (sort === 'name') return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    // Title tiebreak: every portal shares one release date today.
    if (sort === 'updated') {
      return [...filtered].sort(
        (a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title),
      );
    }
    return filtered;
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

        {/* Native radios, hidden behind their labels: arrow-key navigation
            and group semantics come from the browser. */}
        <fieldset className="portals__filters">
          <legend className="sr-only">Filter portals</legend>
          {FILTERS.map((option) => (
            <label
              key={option.value}
              className={
                option.value === category
                  ? 'portals__filter portals__filter--active'
                  : 'portals__filter'
              }
              // The Chip tokens for this colour, so pill and chip match.
              style={
                option.color
                  ? ({
                      '--filter-bg': `var(--bg-${option.color})`,
                      '--filter-bo': `var(--bo-${option.color})`,
                      '--filter-ct': `var(--ct-${option.color})`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <input
                type="radio"
                name="portal-filter"
                value={option.value}
                checked={option.value === category}
                onChange={() => setCategory(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <div className="portals__sort">
          {/* Without `items` the closed trigger shows the raw value. */}
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
          No portals match.{' '}
          <button
            onClick={() => {
              setQuery('');
              setCategory(ALL);
            }}
          >
            Clear search and filters
          </button>{' '}
          to see all {PORTALS.length}.
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

          <div className="portal-card__facets">
            {portal.facets.map((facet) => (
              <Chip key={facet.label} color={facet.color} onWhite>
                {facet.label}
              </Chip>
            ))}
          </div>

          <p className="portal-card__topics">{portal.topics.join(' · ')}</p>

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
