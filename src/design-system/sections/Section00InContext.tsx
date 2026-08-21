import s from './showcase.module.scss';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Frame } from '../components/Frame';
import { Avatar } from '../components/Avatar';
import { NavIcon } from '../components/NavIcon';
import * as Tabs from '../components/Tabs';
import {
  CheckCircle,
  Plus,
  CircleNotch,
  XCircle,
  MagnifyingGlass,
  Notebook,
  Database,
  SquaresFour,
  GraduationCap,
} from '@phosphor-icons/react';
import css from './Section00InContext.module.scss';

export function Section00InContext() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>00</div>
      <div className={s.sTitle}>In context</div>
      <p className={s.sDesc}>How it actually feels.</p>

      <Frame padding={0} style={{ display: 'flex', minHeight: 440 }}>
        <div className={css.sidebar}>
          <svg
            width="24"
            height="16"
            viewBox="0 0 34 28"
            fill="none"
            style={{ marginBottom: 'var(--s-4)' }}
          >
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
          <div style={{ flex: 1 }} />
          <Avatar size={24} variant="solid" color="primary" initials="J" />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className={css.mockHeader}>
            <span className="h2">Projects</span>
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative', width: 160 }}>
              <MagnifyingGlass
                size={12}
                style={{
                  position: 'absolute',
                  left: 'var(--s-5)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--c-ink4)',
                }}
              />
              <Input variant="pill" placeholder="Search..." style={{ paddingLeft: 26 }} />
            </div>
            <Button
              variant="ghost"
              style={{
                fontSize: 'var(--fs-4)',
                padding: 'var(--s-2) var(--s-5)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--bo-primary)',
                color: 'var(--ct-primary)',
                borderRadius: 'var(--r-button)',
              }}
            >
              <Plus size={10} weight="bold" /> New
            </Button>
          </div>
          <div
            style={{
              padding: '0 var(--s-7)',
              display: 'flex',
              borderBottom: '1px solid var(--c-border)',
            }}
          >
            <Tabs.Root defaultValue="mine">
              <Tabs.List>
                <Tabs.Tab value="mine">Mine</Tabs.Tab>
                <Tabs.Tab value="shared">Shared</Tabs.Tab>
                <Tabs.Tab value="public">Public</Tabs.Tab>
              </Tabs.List>
            </Tabs.Root>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--c-surface)' }}>
            <div className={css.mockRow}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--s-3)',
                  marginBottom: 'var(--s-1)',
                }}
              >
                <span className={css.mockRowTitle}>Soil Metagenome Assembly & Annotation</span>
                <Chip color="primary" onWhite icon={CircleNotch} label="Running" />
              </div>
              <div className={css.mockRowMeta}>
                14 cells · 2h ago · <span style={{ fontFamily: 'var(--f-mono)' }}>ws:45221</span>
              </div>
            </div>
            <div className={css.mockRow}>
              <span className={css.mockRowTitle}>E. coli FBA Model Comparison</span>
              <div className={css.mockRowMeta}>8 cells · 3 days ago</div>
            </div>
            <div className={css.mockRow}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--s-3)',
                  marginBottom: 'var(--s-1)',
                }}
              >
                <span className={css.mockRowTitle}>Pangenome Analysis Tutorial</span>
                <Chip color="purple" onWhite icon={GraduationCap} label="Tutorial" />
              </div>
              <div className={css.mockRowMeta}>6 cells · Last week</div>
            </div>
            <div className={css.mockRow}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--s-3)',
                  marginBottom: 'var(--s-1)',
                }}
              >
                <span className={css.mockRowTitle}>Rhizosphere Community Metabolic Modeling</span>
                <Chip color="green" onWhite icon={CheckCircle} label="Complete" />
              </div>
              <div className={css.mockRowMeta}>
                22 cells · Yesterday · <span style={{ fontFamily: 'var(--f-mono)' }}>ws:44918</span>
              </div>
            </div>
            <div className={css.mockRow}>
              <span className={css.mockRowTitle}>Fungal ITS Amplicon Workflow</span>
              <div className={css.mockRowMeta}>4 cells · 2 weeks ago</div>
            </div>
            <div className={css.mockRow} style={{ borderBottom: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--s-3)',
                  marginBottom: 'var(--s-1)',
                }}
              >
                <span className={css.mockRowTitle}>Marine Sediment MAGs</span>
                <Chip color="red" onWhite icon={XCircle} label="Error" />
              </div>
              <div className={css.mockRowMeta}>3 cells · 1h ago</div>
            </div>
          </div>
        </div>
      </Frame>
    </div>
  );
}
