import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Accordion,
  ButtonLink,
  Chip,
  EmptyState,
  Frame,
  SearchBar,
  Select,
} from '@kbase/design-system';
import type { ChipColor } from '@kbase/design-system';
import { ArrowUpRight } from '@phosphor-icons/react';

import styles from './portals.module.css';

export const Route = createFileRoute('/portals')({
  component: PortalsPage,
  staticData: { title: 'Portal gallery' },
});

// A different backend serves /portals/<slug>, so nothing this app serves
// may live under that prefix (hence public/portal-thumbs/).
const PORTAL_BASE = 'https://gen2.kbase.us/portals/';

const CONTACT_EMAIL = 'engage@kbase.us';

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
  /** Also the thumbnail filename: `public/portal-thumbs/<slug>.webp`. */
  slug: string;
  title: string;
  blurb: string;
  facets: PortalFacet[];
  /** Not filterable; rendered as plain text so it reads as prose. */
  topics: string[];
  /** Live data providers. See the note above PORTALS for where these come from. */
  sources: string[];
  version: string;
  /** ISO 8601: the commit date of this version's tag. */
  updated: string;
  /** No screenshot in public/portal-thumbs yet. */
  undeployed?: true;
}

// ══════════════════════════════════════════════════════════════════════════
// ADDING OR UPDATING A PORTAL CARD
//
// Every field below is copied from somewhere authoritative. None of it is
// written from memory, and none of it is inferred. Where each comes from:
//
//   slug        the app's id -- its repo name under kbaseincubator, its key
//               in the KIND*AI manifest, and its thumbnail filename.
//   title       manifest `title`, in the KIND*AI repo at plugins/<slug>.json.
//   blurb       manifest `description`, condensed. RELEASES.md often carries
//               detail worth folding in.
//   facets      chosen from FACETS above. The filter row is derived from
//               these, so a new facet is only worth adding if it groups more
//               than one portal.
//   topics      free text. Not filterable, deliberately.
//   version     what the DEPLOYED portal prints in its own header at
//               PORTAL_BASE + slug. Several repos are tagged ahead of what
//               is live, and this page must say what a visitor gets. If it
//               is not serving yet, use the newest tag.
//   updated     the commit date of that version's tag:
//                 gh api repos/kbaseincubator/<repo>/tags
//                 gh api repos/kbaseincubator/<repo>/commits/<sha>
//   undeployed  set when there is no public/portal-thumbs/<slug>.webp yet.
//               The ONLY thing it changes is the thumbnail, which becomes an
//               EmptyState. The card still links out, exactly like any other.
//
// SOURCES
//
// The mesh has a ratified machine-readable standard for attribution,
// OBS-20260812-cite-json-schema. In order of preference:
//
//   1. `<app> sources --json` -- the CLI verb each app exposes (genknown,
//      diaspora, plantterra, fungaljungle, funcjunction).
//        envelope  { app, version, subject, note, sources: [ … ] }
//        record    required id · name · homepage · citation
//                  optional provider · license · use · group
//   2. src/<app>/sources.py -- the registry behind that verb. Function
//      Junction's is the reference implementation and states the rule: it is
//      the single source of truth, and the in-app footer is derived from it
//      so the two never drift. ENIGMA Strata has one too.
//   3. docs/DATA_SOURCES.md -- Plant Terra and Fungal Jungle. Read it as an
//      ingest plan, not an attribution list: only rows marked have/ingested/
//      SHIPPED are live.
//   4. The "data sources" disclosure the running portal renders.
//
// Credit only what the live app actually draws on. Leave `sources` empty
// rather than guess.
//
// THUMBNAILS
//
// public/portal-thumbs/<slug>.webp at 1280x800, captured from the live
// portal driven to a view with data in it. Cloudflare at gen2.kbase.us
// challenges browser user-agents and admits tool ones, so a headless
// browser needs a proxy presenting a tool UA to load the page at all.
//
// Only portals cleared for public display belong here: the bundle is public,
// so an uncleared entry is readable whether or not it is rendered. Array
// order is the `default` sort.
// ══════════════════════════════════════════════════════════════════════════
const PORTALS: readonly Portal[] = [
  {
    slug: 'genknown',
    title: 'genKnown',
    blurb:
      'A taxonomic telescope. Search any node of the tree of life for a rank-relative evidence report: measured and predicted physiology, ecology, and metabolite exchange.',
    facets: [FACETS.genomes, FACETS.ecology],
    topics: ['Taxonomy', 'Physiology', 'Metabolite exchange'],
    sources: [
      'GTDB',
      'NCBI Taxonomy',
      'KBase KE-pangenome',
      'Fitness Browser (RB-TnSeq)',
      'BacDive',
      'KBase carbon-source growth panel',
      'ENIGMA CORAL growth curves (LBNL)',
      'GenomeSPOT',
      'GapMind',
      'Web of Microbes',
      'Rhea / ChEBI',
      'Microbe Atlas',
      'NMDC',
      'GOLD',
    ],
    version: 'v0.1.3',
    updated: '2026-08-21',
  },
  {
    slug: 'diaspora',
    title: 'Diaspora',
    blurb:
      'A microbial-ecology atlas. Walk compendium → cohort → sample → MAG, linking metagenome observations to physicochemistry, geography, and pangenome-resolved function.',
    facets: [FACETS.ecology, FACETS.environment],
    topics: ['Metagenomics', 'Biogeography', 'Pangenomes'],
    sources: [
      'NMDC',
      'NEON',
      'EMP',
      'GROWdb (USGS)',
      'PlanetMicrobe',
      'agmicrobiome',
      'MGnify',
      'SPIRE',
      'SMAG',
      'JGI-GEM',
      'Tara Oceans',
      'Microbe Atlas',
      'KBase KE-pangenome',
    ],
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
    sources: [
      'JGI Phytozome',
      'Ensembl Plants',
      'UniProt',
      'InterPro',
      'GO',
      'Rhea',
      'Ensembl plant VCF',
      'USDA NRCS PLANTS',
      'USDA NASS QuickStats',
      'WorldClim',
      'SoilGrids',
      'CHELSA',
      'SSURGO',
      'GBIF',
    ],
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
    sources: [
      'Ensembl Fungi',
      'JGI MycoCosm',
      'SGD',
      'PomBase',
      'CGD',
      'NCBI Datasets / Taxonomy',
      'GBIF backbone',
      'CAZy',
      'dbCAN',
      'MEROPS',
      'TCDB',
      'InterPro',
      'MIBiG',
      'antiSMASH-DB',
      'FunGuild',
      'AlphaFold DB',
      'UniProt',
      'WorldClim v2',
      'SoilGrids',
    ],
    version: 'v0.6.0',
    updated: '2026-08-21',
  },
  {
    slug: 'function-junction',
    title: 'Function Junction',
    blurb:
      'Paste a protein — id, sequence, gene, or name — and get every line of functional evidence converged on one page, scored for novelty and information density.',
    facets: [FACETS.proteins],
    topics: ['Annotation', 'Structure', 'Homologs'],
    sources: [
      'UniProtKB',
      'InterPro',
      'Reactome',
      'Rhea',
      'ModelSEED',
      'PubChem',
      'AlphaFold DB',
      'RCSB PDB',
      'Foldseek',
      'ESM-2',
      'GTDB / NCBI Taxonomy',
      'KBase KE-pangenome',
      'GenomeDepot (LBNL)',
      'DIAMOND DeepClust',
      'Fitness Browser',
      'BacDive',
      'BRENDA',
      'STRING',
      'PaperBLAST',
      'NMDC',
      'SPIRE / GBIF',
    ],
    version: 'v0.2.0',
    updated: '2026-08-21',
  },
  {
    slug: 'enigma-strata',
    title: 'ENIGMA Strata',
    blurb:
      'A branded portal over the ENIGMA subsurface lakehouse — geology, hydrology, geochemistry, biogeography, and genomes of the Oak Ridge plume in one cross-linked focus.',
    facets: [FACETS.environment, FACETS.genomes],
    topics: ['Subsurface', 'Geochemistry', 'Biogeography'],
    sources: [
      'ENIGMA (LBNL)',
      'CORAL',
      'GenomeDepot',
      'Fitness Browser (RB-TnSeq)',
      'Microbe Atlas',
      'MGnify',
      'NMDC',
      'Web of Microbes',
      'NOAA GHCN-Daily',
    ],
    version: 'v0.4.0',
    updated: '2026-08-21',
  },
  {
    slug: 'phagecast',
    title: 'Phagecast',
    blurb:
      'Phage and host genomics over the Phage Foundry tenant — browse genomes and phage–host interactions, with on-demand receptor and host-range prediction.',
    facets: [FACETS.genomes, FACETS.proteins],
    topics: ['Phage', 'Host range', 'Receptors'],
    // No sources registry yet; these are from the README and docs/STORAGE.md.
    sources: ['Phage Foundry (DOE BER)', 'GenomeDepot'],
    version: 'v0.45.7',
    updated: '2026-08-23',
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
    ...portal.sources,
    ...portal.facets.map((f) => f.label),
    ...portal.topics,
  ]
    .join(' ')
    .toLowerCase();
}

function PortalsPage() {
  return (
    <div className={styles.page}>
      <TopBar />

      <main className={styles.main}>
        <Hero />
        <Gallery />
      </main>

      <SiteFooter />
    </div>
  );
}

function TopBar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <span className={styles.brand}>
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
    <section className={styles.hero}>
      <h1 className={styles.headline}>KBase 2.0 Portal Gallery</h1>
      <p className={styles.lead}>
        Discover modern scientific portals built on the KBase ecosystem.
      </p>
    </section>
  );
}

function PartnerNotice() {
  return (
    <Frame paddingY={8} paddingX={8} className={styles.partner}>
      <div>
        <p className={styles.partnerTitle}>
          <Chip color="yellow" onWhite label="Beta" /> Early adoption partner program
        </p>
        <p className={styles.partnerBody}>
          DOE-associated labs and facilities can make their data and tools available and shareable
          in KBase 2.0. Partners receive access to our programmatic and AI systems, and support in
          prototyping their own branded portal.
        </p>
      </div>
      {/* The address is the label: a mailto hands the reader off to another
          application, so showing it lets them copy it into whatever they
          actually use rather than trusting a registered handler. */}
      <ButtonLink
        href={`mailto:${CONTACT_EMAIL}`}
        aria-label={`Email ${CONTACT_EMAIL} about the early adoption partner program`}
      >
        {CONTACT_EMAIL}
      </ButtonLink>
    </Frame>
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
    <section aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className={styles.srOnly}>
        Published portals
      </h2>

      <PartnerNotice />

      <div className={styles.controls}>
        <SearchBar
          value={query}
          onValueChange={setQuery}
          placeholder="Search portals by name or keyword..."
          className={styles.search}
          aria-label="Search portals"
        />

        {/* Native radios, hidden behind their labels: arrow-key navigation
            and group semantics come from the browser. */}
        <fieldset className={styles.filters}>
          <legend className={styles.srOnly}>Filter portals</legend>
          {FILTERS.map((option) => (
            <label
              key={option.value}
              className={`${styles.filter} ${option.value === category ? styles.filterActive : ''}`}
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

        <div className={styles.sort}>
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

      <p className={styles.count} role="status">
        {visible.length === PORTALS.length
          ? `${PORTALS.length} portals`
          : `${visible.length} of ${PORTALS.length} portals`}
      </p>

      {visible.length === 0 ? (
        <p className={styles.empty}>
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
        <ul className={styles.grid}>
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

function PortalSources({ sources }: { sources: string[] }) {
  // `summary` is the component's slot for a count, and stays on the trigger
  // in both states.
  return (
    <Accordion.Root className={styles.sources}>
      <Accordion.Item value="sources" title="Data sources" summary={sources.length}>
        <ul>
          {sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      </Accordion.Item>
    </Accordion.Root>
  );
}

function PortalCard({ portal }: { portal: Portal }) {
  return (
    <Frame padding={0} className={styles.card}>
      {/* The link wraps only what should be clickable: a disclosure inside an
          anchor would be an interactive element nested in another. */}
      <a
        className={styles.cardLink}
        href={`${PORTAL_BASE}${portal.slug}/`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open the ${portal.title} portal (opens in a new tab)`}
      >
        {portal.undeployed ? (
          <EmptyState title="No screenshot yet" className={styles.shotEmpty} />
        ) : (
          <img
            className={styles.shot}
            src={`/portal-thumbs/${portal.slug}.webp`}
            alt={`Screenshot of the ${portal.title} portal`}
            width={640}
            height={400}
            loading="lazy"
          />
        )}
        <div className={styles.cardBody}>
          <div className={styles.titleRow}>
            <h3 className="h3">{portal.title}</h3>
            <ArrowUpRight size={14} className={styles.go} aria-hidden="true" />
          </div>

          <p className={styles.blurb}>{portal.blurb}</p>

          <div className={styles.facets}>
            {portal.facets.map((facet) => (
              <Chip key={facet.label} color={facet.color} onWhite label={facet.label} />
            ))}
          </div>

          <p className={styles.topics}>{portal.topics.join(' · ')}</p>
        </div>
      </a>

      {portal.sources.length > 0 && <PortalSources sources={portal.sources} />}

      <div className={styles.meta}>
        <span className="mono-secondary">{portal.version}</span>
        <span aria-hidden="true">&middot;</span>
        <span>Updated {formatUpdated(portal.updated)}</span>
      </div>
    </Frame>
  );
}

function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <span className="note">
        KBase &middot; a DOE Biological and Environmental Research data platform
      </span>
      <nav className={styles.footerLinks}>
        <a href="https://www.kbase.us/" target="_blank" rel="noopener noreferrer">
          About KBase
        </a>
      </nav>
    </footer>
  );
}
