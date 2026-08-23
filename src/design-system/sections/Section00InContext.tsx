import { useState, type ReactNode } from 'react';
import s from './showcase.module.scss';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Frame } from '../components/Frame';
import { Row } from '../components/Row';
import { Avatar } from '../components/Avatar';
import { NavIcon } from '../components/NavIcon';
import { SearchBar } from '../components/SearchBar';
import * as Tabs from '../components/Tabs';
import {
  CheckCircle,
  Plus,
  CircleNotch,
  XCircle,
  Notebook,
  Database,
  SquaresFour,
  GraduationCap,
} from '@phosphor-icons/react';
import css from './Section00InContext.module.scss';

const ws = (id: string) => <span className={css.ws}>{id}</span>;

const projects: { title: string; status?: ReactNode; meta: ReactNode }[] = [
  {
    title: 'Soil Metagenome Assembly & Annotation',
    status: <Chip color="primary" onWhite icon={CircleNotch} label="Running" />,
    meta: <>14 cells · 2h ago · {ws('ws:45221')}</>,
  },
  { title: 'E. coli FBA Model Comparison', meta: '8 cells · 3 days ago' },
  {
    title: 'Pangenome Analysis Tutorial',
    status: <Chip color="purple" onWhite icon={GraduationCap} label="Tutorial" />,
    meta: '6 cells · Last week',
  },
  {
    title: 'Rhizosphere Community Metabolic Modeling',
    status: <Chip color="green" onWhite icon={CheckCircle} label="Complete" />,
    meta: <>22 cells · Yesterday · {ws('ws:44918')}</>,
  },
  { title: 'Fungal ITS Amplicon Workflow', meta: '4 cells · 2 weeks ago' },
  {
    title: 'Marine Sediment MAGs',
    status: <Chip color="red" onWhite icon={XCircle} label="Error" />,
    meta: '3 cells · 1h ago',
  },
];

export function Section00InContext() {
  const [query, setQuery] = useState('');

  return (
    <div className={s.section}>
      <div className={s.sNum}>00</div>
      <div className={s.sTitle}>In context</div>
      <p className={s.sDesc}>A screen built from the components documented below.</p>

      <Frame padding={0} className={css.app}>
        <div className={css.sidebar}>
          <svg width="24" height="16" viewBox="0 0 34 28" fill="none" className={css.mark}>
            <circle cx="7" cy="14" r="8" fill="var(--c-yellow)" opacity="0.85" />
            <circle cx="17" cy="14" r="8" fill="var(--c-grellow)" opacity="0.85" />
            <circle cx="27" cy="14" r="8" fill="var(--c-ocean)" opacity="0.85" />
          </svg>
          <NavIcon aria-label="Projects" active>
            <Notebook size={17} weight="fill" />
          </NavIcon>
          <NavIcon aria-label="Data">
            <Database size={17} />
          </NavIcon>
          <NavIcon aria-label="Apps">
            <SquaresFour size={17} />
          </NavIcon>
          <div className={css.spacer} />
          <Avatar size={24} variant="solid" color="primary" initials="J" />
        </div>

        <div className={css.main}>
          <div className={css.mockHeader}>
            <span className="h2">Projects</span>
            <div className={css.spacer} />
            <SearchBar
              value={query}
              onValueChange={setQuery}
              aria-label="Search projects"
              className={css.search}
            />
            <Button variant="primary" size="sm">
              <Plus size={10} weight="bold" /> New
            </Button>
          </div>

          <div className={css.tabBar}>
            <Tabs.Root defaultValue="mine">
              <Tabs.List>
                <Tabs.Tab value="mine">Mine</Tabs.Tab>
                <Tabs.Tab value="shared">Shared</Tabs.Tab>
                <Tabs.Tab value="public">Public</Tabs.Tab>
              </Tabs.List>
            </Tabs.Root>
          </div>

          <div className={css.list}>
            {projects.map((p) => (
              <Row
                key={p.title}
                title={
                  <span className={css.rowTitle}>
                    {p.title}
                    {p.status}
                  </span>
                }
                meta={p.meta}
              />
            ))}
          </div>
        </div>
      </Frame>
    </div>
  );
}
