import { Link, createFileRoute } from '@tanstack/react-router';
import { Button, Chip, Frame } from '@kbase/design-system';
import type { ChipColor } from '@kbase/design-system';
import {
  ArrowUpRight,
  ChatCircleDots,
  Database,
  Sparkle,
  Stack,
  UploadSimple,
} from '@phosphor-icons/react';

export const Route = createFileRoute('/portals')({
  component: PortalsPage,
  staticData: { title: 'Published portals' },
});

/**
 * Where a scientist goes to build a portal. KIND*AI is served per-user
 * behind the BERDL JupyterHub proxy (`/user/<you>/proxy/8770/`), so the
 * hub root is the only stable entry point we can link an anonymous
 * visitor at.
 */
const KINDAI_URL = 'https://hub.berdl.kbase.us/';

/**
 * Placeholder deep links. Published portals have no public URL yet --
 * today each one launches per-user through the hub proxy on an
 * allocated port. Swap this (and the per-portal `slug`) for the real
 * published-portal endpoint once publishing exists.
 */
const PORTAL_BASE = 'https://hub.berdl.kbase.us/portals/';

interface PortalTag {
  label: string;
  color: ChipColor;
}

interface Portal {
  /** Also the thumbnail filename: `public/portals/<slug>.svg`. */
  slug: string;
  title: string;
  blurb: string;
  tags: PortalTag[];
  version: string;
  /** ISO date, rendered through `PUBLISHED_FMT`. */
  published: string;
  /** Shown as a chip when the portal ships with caveats. */
  status?: string;
}

// Titles, blurbs, and versions track the app manifests and release pins
// in the KIND*AI repo (`plugins/*.json`, `RELEASES.md`).
const PORTALS: readonly Portal[] = [
  {
    slug: 'enigma-strata',
    title: 'ENIGMA Strata',
    blurb:
      'A branded portal over the ENIGMA subsurface lakehouse — geology, hydrology, geochemistry, biogeography, and genomes of the Oak Ridge plume in one cross-linked focus.',
    tags: [
      { label: 'Subsurface', color: 'orange' },
      { label: 'Geochemistry', color: 'teal' },
      { label: 'Biogeography', color: 'green' },
    ],
    version: 'v0.1.0',
    published: '2026-07-27',
  },
  {
    slug: 'function-junction',
    title: 'Function Junction',
    blurb:
      'Paste a protein — id, sequence, gene, or name — and get every line of functional evidence converged on one page, scored for novelty and information density.',
    tags: [
      { label: 'Proteins', color: 'primary' },
      { label: 'Annotation', color: 'purple' },
      { label: 'Structure', color: 'ocean' },
    ],
    version: 'v0.1.0',
    published: '2026-07-27',
  },
  {
    slug: 'diaspora',
    title: 'Diaspora',
    blurb:
      'A microbial-ecology atlas. Walk compendium → cohort → sample → MAG, linking metagenome observations to physicochemistry, geography, and pangenome-resolved function.',
    tags: [
      { label: 'Metagenomics', color: 'teal' },
      { label: 'Ecology', color: 'green' },
    ],
    version: 'v0.2.1',
    published: '2026-08-04',
  },
  {
    slug: 'genknown',
    title: 'genKnown',
    blurb:
      'A taxonomic telescope. Search any node of the tree of life for a rank-relative evidence report: measured and predicted physiology, ecology, and metabolite exchange.',
    tags: [
      { label: 'Taxonomy', color: 'green' },
      { label: 'Physiology', color: 'teal' },
    ],
    version: 'v0.1.0',
    published: '2026-07-27',
    status: 'Tester preview',
  },
  {
    slug: 'plant-terra',
    title: 'Plant Terra',
    blurb:
      'Plant functional genomics with genomes in environmental context — a per-genome dossier spanning comparative genomics, metabolism, variation, and G×E.',
    tags: [
      { label: 'Plants', color: 'green' },
      { label: 'Genomics', color: 'primary' },
    ],
    version: 'v0.1.0',
    published: '2026-08-11',
  },
  {
    slug: 'fungal-jungle',
    title: 'Fungal Jungle',
    blurb:
      'Per-genome fungal functional genomics: CAZyme repertoire crossed with ecological guild, plus model-organism deep dives, structure, and biogeography.',
    tags: [
      { label: 'Fungi', color: 'yellow' },
      { label: 'CAZymes', color: 'orange' },
    ],
    version: 'v0.1.0',
    published: '2026-08-11',
  },
  {
    slug: 'genepool',
    title: 'GenePool',
    blurb:
      "You versus the machine. Judge the AI annotator's calls on real proteins to build a certified, trust-weighted competence leaderboard.",
    tags: [
      { label: 'Benchmarking', color: 'purple' },
      { label: 'Annotation', color: 'primary' },
    ],
    version: 'v0.1.0',
    published: '2026-07-27',
  },
];

const PUBLISHED_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatPublished(iso: string): string {
  return PUBLISHED_FMT.format(new Date(`${iso}T00:00:00Z`));
}

function PortalsPage() {
  return (
    <div className="portals">
      <TopBar />

      <main className="portals__main">
        <Hero />
        <HowItWorks />
        <Gallery />
        <PublishBand />
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
          <img src="/kbase-logo-ref.png" alt="KBase" height={26} />
          <span className="portals__brand-divider" aria-hidden="true" />
          <span className="portals__brand-name">Lakehouse</span>
        </span>
        <Link to="/login" className="portals__signin">
          Sign in
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="portals__hero">
      <Chip color="teal">
        <Database size={11} weight="fill" aria-hidden="true" /> Built on the KBase Lakehouse
      </Chip>

      <h1 className="portals__headline">KBase Published Portals</h1>

      <p className="portals__lead">
        Interactive research portals over DOE Biological and Environmental Research data — assembled
        from the KBase Lakehouse, built with <Kindai />, and published here for anyone to explore.
        No account needed to look around.
      </p>

      <div className="portals__cta-row">
        <Button
          size="md"
          nativeButton={false}
          render={<a href={KINDAI_URL} target="_blank" rel="noopener noreferrer" />}
        >
          <Sparkle size={16} weight="fill" aria-hidden="true" />
          <span>
            Develop a portal in <Kindai />
          </span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </Button>

        <span className="portals__cta-disabled">
          <Button size="md" variant="outline" disabled>
            <UploadSimple size={16} weight="fill" aria-hidden="true" />
            Publish your portal
          </Button>
          <Chip color="yellow">Coming soon</Chip>
        </span>
      </div>

      <p className="portals__cta-note">
        Publishing a portal you have built to this page is not switched on yet. For now, portals
        reach the gallery through the <Kindai /> publish gate.
      </p>
    </section>
  );
}

/** KIND*AI wants the asterisk kept, and kept out of the way of italics. */
function Kindai() {
  return (
    <span className="portals__kindai">
      KIND<span aria-hidden="true">*</span>AI
    </span>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <ChatCircleDots size={18} weight="fill" />,
      tint: 'primary' as const,
      title: 'Ask a research question',
      body: 'Describe what you want to know in plain language. KIND*AI drives the research session and shows you the plan, the decisions, and the results.',
    },
    {
      icon: <Database size={18} weight="fill" />,
      tint: 'teal' as const,
      title: 'It builds on Lakehouse data',
      body: 'Governed, FAIR-compliant data from across the BER ecosystem — JGI, NMDC, EMSL, ESS-DIVE, ARM — queried in place, with provenance carried through.',
    },
    {
      icon: <Stack size={18} weight="fill" />,
      tint: 'green' as const,
      title: 'The portal gets published',
      body: 'A finished project produces a portal. Once it clears the review panel, it is published, attributed by ORCID, and lands in this gallery.',
    },
  ];

  return (
    <section className="portals__how">
      <h2 className="section-label">How a portal gets here</h2>
      <ol className="portals__steps">
        {steps.map((step, i) => (
          <li key={step.title}>
            <Frame paddingY={8} paddingX={8} style={{ height: '100%' }}>
              <div className="portals__step-head">
                <span
                  className="portals__step-icon"
                  aria-hidden="true"
                  style={{
                    background: `var(--bgw-${step.tint})`,
                    color: `var(--ct-${step.tint})`,
                  }}
                >
                  {step.icon}
                </span>
                <span className="portals__step-num">{i + 1}</span>
              </div>
              <h3 className="h4">{step.title}</h3>
              <p className="note" style={{ marginTop: 'var(--s-3)' }}>
                {step.body}
              </p>
            </Frame>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Gallery() {
  return (
    <section className="portals__gallery" aria-labelledby="published-heading">
      <div className="portals__gallery-head">
        <h2 id="published-heading" className="h2">
          Published portals
        </h2>
        <span className="note">{PORTALS.length} published &middot; more on the way</span>
      </div>

      <ul className="portals__grid">
        {PORTALS.map((portal) => (
          <li key={portal.slug}>
            <PortalCard portal={portal} />
          </li>
        ))}
        <li>
          <PlaceholderCard />
        </li>
      </ul>
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
          src={`/portals/${portal.slug}.svg`}
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
        </div>

        <div className="portal-card__meta">
          <span className="mono-secondary">{portal.version}</span>
          <span aria-hidden="true">&middot;</span>
          <span>Published {formatPublished(portal.published)}</span>
        </div>
      </Frame>
    </a>
  );
}

/**
 * Closes out the grid with the slot a reader's own portal would occupy.
 * Deliberately inert: it advertises the coming-soon publish flow rather
 * than pretending to start it.
 */
function PlaceholderCard() {
  return (
    <div className="portal-card portal-card--placeholder">
      <span className="portal-card__placeholder-icon" aria-hidden="true">
        <UploadSimple size={22} weight="fill" />
      </span>
      <h3 className="h3">Your portal here</h3>
      <p className="note" style={{ marginTop: 'var(--s-3)', maxWidth: '32ch' }}>
        Publish a portal you have built in <Kindai /> straight to this gallery.
      </p>
      <span style={{ marginTop: 'var(--s-6)' }}>
        <Chip color="yellow" onWhite>
          Coming soon
        </Chip>
      </span>
    </div>
  );
}

function PublishBand() {
  return (
    <section className="portals__band">
      <Frame
        paddingY={10}
        paddingX={10}
        style={{ background: 'var(--bg-yellow)', borderColor: 'var(--bo-yellow)' }}
      >
        <div className="portals__band-inner">
          <div>
            <div className="portals__band-head">
              <h2 className="h2" style={{ margin: 0 }}>
                Publish a portal of your own
              </h2>
              <Chip color="yellow" onWhite>
                Coming soon
              </Chip>
            </div>
            <p className="body" style={{ color: 'var(--c-ink2)', marginTop: 'var(--s-4)' }}>
              Self-service publishing to this page is on the way. Build your portal in <Kindai />{' '}
              today — when publishing opens, finished portals will land here with your ORCID on
              them.
            </p>
          </div>

          <div className="portals__band-actions">
            <Button size="md" variant="outline" disabled>
              <UploadSimple size={16} weight="fill" aria-hidden="true" />
              Publish your portal
            </Button>
            <Button
              size="md"
              variant="ghost"
              nativeButton={false}
              render={<a href={KINDAI_URL} target="_blank" rel="noopener noreferrer" />}
            >
              <span>
                Start in <Kindai />
              </span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Frame>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="portals__footer">
      <span className="note">
        KBase Lakehouse &middot; a DOE Biological and Environmental Research data platform
      </span>
      <nav className="portals__footer-links">
        <a href="https://docs.lakehouse.kbase.us/" target="_blank" rel="noopener noreferrer">
          Documentation
        </a>
        <a href="https://www.kbase.us/" target="_blank" rel="noopener noreferrer">
          About KBase
        </a>
        <Link to="/login">Sign in</Link>
      </nav>
    </footer>
  );
}
