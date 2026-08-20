import { Link, createFileRoute } from '@tanstack/react-router';
import { Chip, Frame } from '@kbase/design-system';
import {
  ArrowUpRight,
  Database,
  Flask,
  FolderOpen,
  Notebook,
  Palette,
  UsersThree,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { useMe } from '../api/auth';

export const Route = createFileRoute('/')({
  component: HomePage,
  staticData: { title: 'Roadmap' },
});

function HomePage() {
  const me = useMe();

  return (
    <>
      <header className="page-hero">
        <h1 className="page-hero__headline">Welcome, {me.display}</h1>
        <p className="page-hero__tagline">
          One surface for your KBase tenants, data, files, and projects, with AI-powered discovery
          and search coming soon.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-7)' }}>
        <CoScientistHero />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--s-7)',
          }}
        >
          <DestinationCard
            icon={<UsersThree size={20} weight="fill" />}
            tint="ocean"
            title="Tenants"
            description="Tenants you're a member of."
          />
          <DestinationCard
            icon={<Database size={20} weight="fill" />}
            tint="primary"
            title="Data"
            description="Databases and tables across the lakehouse."
          />
          <DestinationCard
            icon={<FolderOpen size={20} weight="fill" />}
            tint="orange"
            title="Files"
            description="Object-store files for your tenants."
          />
          <DestinationCard
            icon={<Notebook size={20} weight="fill" />}
            tint="yellow"
            title="Projects"
            description="Your research projects."
          />
        </div>

        <DesignSystemFooter />
      </div>
    </>
  );
}

function DesignSystemFooter() {
  return (
    <Frame style={{ marginTop: 'var(--s-7)' }}>
      <Link
        to="/design-system"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-5)',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 'var(--r-md)',
            background: 'var(--bgw-purple)',
            color: 'var(--ct-purple)',
            flexShrink: 0,
          }}
        >
          <Palette size={20} weight="fill" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h3">Design system</div>
          <p className="note" style={{ marginTop: 'var(--s-2)' }}>
            Components, tokens, and patterns powering this app.
          </p>
        </div>
        <ArrowUpRight size={14} style={{ color: 'var(--c-ink4)', flexShrink: 0 }} />
      </Link>
    </Frame>
  );
}

function CoScientistHero() {
  return (
    <Frame
      paddingY={8}
      paddingX={9}
      style={{ background: 'var(--bgw-green)', borderColor: 'var(--bo-green)' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-4)',
          marginBottom: 'var(--s-3)',
          flexWrap: 'wrap',
        }}
      >
        <Flask
          size={28}
          weight="fill"
          aria-hidden="true"
          style={{ color: 'var(--ct-green)', flexShrink: 0 }}
        />
        <h2 className="h2" style={{ margin: 0 }}>
          Co-Scientist
        </h2>
        <Chip color="yellow" onWhite>
          Coming soon
        </Chip>
      </div>
      <p className="body" style={{ color: 'var(--c-ink2)', maxWidth: '70ch', margin: 0 }}>
        Ask in plain English. The platform plans, queries the lakehouse, and writes back findings,
        reaching into your tenants, data, files, and projects.
      </p>
    </Frame>
  );
}

interface DestinationCardProps {
  icon: ReactNode;
  tint: 'ocean' | 'primary' | 'green' | 'yellow' | 'purple' | 'orange';
  title: string;
  description: string;
}

function DestinationCard({ icon, tint, title, description }: DestinationCardProps) {
  return (
    <Frame>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--s-4)',
          marginBottom: 'var(--s-5)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 'var(--r-md)',
            background: `var(--bgw-${tint})`,
            color: `var(--ct-${tint})`,
          }}
        >
          {icon}
        </span>
        <Chip color="yellow" onWhite>
          Coming soon
        </Chip>
      </div>
      <h3 className="h3">{title}</h3>
      <p className="body" style={{ color: 'var(--c-ink3)', marginTop: 'var(--s-3)' }}>
        {description}
      </p>
    </Frame>
  );
}
