import { useState } from 'react';
import s from './Showcase.module.scss';
// Showcase-only, and unreachable from index.ts, so it ships with nothing.
import './example-brand.css';
import { Sun, Moon, Desktop } from '@phosphor-icons/react';
import { useTheme } from './theme/useTheme';
import type { ThemeChoice } from './theme/useTheme';
import { SegmentedControl } from './components/SegmentedControl';
import { Package, CaretRight } from '@phosphor-icons/react';
import * as Collapsible from './components/Collapsible';
import { Frame } from './components/Frame';
import { useToastManager } from './components/Toast';
import { DataExplorerAppendix } from './appendix/DataExplorer';
import { JobsNotificationsAppendix } from './appendix/JobsNotifications';
import { AppCatalogAppendix } from './appendix/AppCatalog';
import { ChatAppendix } from './appendix/Chat';
import { ProjectAppendix } from './appendix/Project';
import { ObjectViewerAppendix } from './appendix/ObjectViewer';
import {
  Section00InContext,
  Section01Tokens,
  Section02Color,
  Section03Typography,
  Section04Forms,
  Section05Actions,
  Section06Feedback,
  Section07Data,
  Section08Overlays,
  Section09Layout,
  Section10Icons,
  Section11Implementation,
  Section12Navigation,
} from './sections';

type CvdMode = 'off' | 'deutan' | 'protan';
const CVD_ID = 'kbase-cvd-root';
const CVD_FILTERS: Record<CvdMode, string> = {
  off: '',
  deutan: 'url(#deutan)',
  protan: 'url(#protan)',
};
// A portal stamps this once in its own HTML and never changes it. The
// showcase toggles it so both palettes can be seen in one sitting.
const BRAND_ATTR = 'data-brand';
function applyBrand(on: boolean) {
  const root = document.documentElement;
  if (on) root.setAttribute(BRAND_ATTR, 'example');
  else root.removeAttribute(BRAND_ATTR);
}

function applyCvdFilter(mode: CvdMode) {
  const el = document.getElementById(CVD_ID);
  if (!el) return;
  const val = CVD_FILTERS[mode];
  const wc = mode !== 'off' ? 'filter' : '';
  el.style.filter = val;
  el.style.willChange = wc;
  // Safari doesn't propagate filters through overflow:hidden stacking contexts.
  el.querySelectorAll('[style*="overflow"], [class*="frame"]').forEach((child) => {
    (child as HTMLElement).style.filter = val;
    (child as HTMLElement).style.willChange = wc;
  });
}

function PackageCallout() {
  const repoUrl = 'https://github.com/kbase/next-gen-ui';
  const packageUrl = 'https://github.com/kbase/next-gen-ui/pkgs/npm/design-system';
  const releasesUrl = 'https://github.com/kbase/next-gen-ui/releases';

  const registrySnippet = [
    '# ~/.npmrc: point @kbase at GitHub Packages and authenticate',
    '@kbase:registry=https://npm.pkg.github.com',
    '//npm.pkg.github.com/:_authToken=<GH_PAT with read:packages>',
    '',
    '# in your project',
    'npm install @kbase/design-system',
  ].join('\n');

  const tarballSnippet = [
    '# Download the .tgz attached to a ds-vX.Y.Z release, e.g.:',
    'gh release download ds-v0.1.0 \\',
    '  --repo kbase/next-gen-ui \\',
    '  --pattern "kbase-design-system-*.tgz"',
    '',
    '# install the local tarball',
    'npm install ./kbase-design-system-0.1.0.tgz',
  ].join('\n');

  return (
    <Frame
      paddingY={3}
      paddingX={7}
      style={{ margin: 'var(--s-9) 0', background: 'var(--c-raised)' }}
    >
      <Collapsible.Root>
        <Collapsible.Trigger>
          <CaretRight size={12} className={s.calloutCaret} />
          <Package size={14} weight="fill" /> Use it in your project
        </Collapsible.Trigger>
        <Collapsible.Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
            <p className="note" style={{ maxWidth: '70ch', margin: 0 }}>
              Published as{' '}
              <a className="link" href={packageUrl} target="_blank" rel="noopener noreferrer">
                <code>@kbase/design-system</code>
              </a>{' '}
              on GitHub Packages.
            </p>
            <p className="note" style={{ maxWidth: '70ch', margin: 0 }}>
              Sourced from{' '}
              <a className="link" href={repoUrl} target="_blank" rel="noopener noreferrer">
                <code>kbase/next-gen-ui</code>
              </a>
              .
            </p>
            <div>
              <div className="h4" style={{ marginBottom: 'var(--s-3)' }}>
                Install from the registry
              </div>
              <p className="note" style={{ marginBottom: 'var(--s-3)', maxWidth: '70ch' }}>
                GitHub Packages npm requires auth even for public packages. You'll need a GitHub PAT
                with <code>read:packages</code> scope and an <code>.npmrc</code> pointing the{' '}
                <code>@kbase</code> scope at <code>npm.pkg.github.com</code>.
              </p>
              <pre style={installPreStyle}>{registrySnippet}</pre>
            </div>
            <div>
              <div className="h4" style={{ marginBottom: 'var(--s-3)' }}>
                Install from a release tarball
              </div>
              <p className="note" style={{ marginBottom: 'var(--s-3)', maxWidth: '70ch' }}>
                Each <code>ds-v*</code>{' '}
                <a className="link" href={releasesUrl} target="_blank" rel="noopener noreferrer">
                  release
                </a>{' '}
                has the published <code>.tgz</code> attached as an asset. Downloading the tarball
                and installing it locally bypasses the registry auth dance entirely.
              </p>
              <pre style={installPreStyle}>{tarballSnippet}</pre>
            </div>
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </Frame>
  );
}

const installPreStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--fs-5)',
  fontFamily: 'var(--f-mono)',
  color: 'var(--c-ink2)',
  background: 'var(--c-surface)',
  padding: 'var(--s-5) var(--s-6)',
  borderRadius: 'var(--r-sm)',
  overflowX: 'auto',
};

const SECTIONS: { id: string; n: string; label: string }[] = [
  { id: 'sec-00', n: '00', label: 'In context' },
  { id: 'sec-01', n: '01', label: 'Spacing & Layout' },
  { id: 'sec-02', n: '02', label: 'Color' },
  { id: 'sec-03', n: '03', label: 'Typography' },
  { id: 'sec-04', n: '04', label: 'Forms' },
  { id: 'sec-05', n: '05', label: 'Actions' },
  { id: 'sec-06', n: '06', label: 'Feedback' },
  { id: 'sec-07', n: '07', label: 'Data' },
  { id: 'sec-08', n: '08', label: 'Overlays' },
  { id: 'sec-09', n: '09', label: 'Structure' },
  { id: 'sec-10', n: '10', label: 'Icons' },
  { id: 'sec-11', n: '11', label: 'Code and prose' },
  { id: 'sec-12', n: '12', label: 'Navigation' },
];

const APPENDIX: { id: string; n: string; label: string }[] = [
  { id: 'app-data-explorer', n: 'A', label: 'Data Explorer' },
  { id: 'app-jobs-notifications', n: 'B', label: 'Jobs & Notifications' },
  { id: 'app-app-catalog', n: 'C', label: 'App Catalog' },
  { id: 'app-object-viewer', n: 'D', label: 'Object Viewer' },
  { id: 'app-chat', n: 'E', label: 'Chat' },
  { id: 'app-project', n: 'F', label: 'Project' },
];

function TableOfContents() {
  return (
    <nav aria-label="Sections" className={s.toc}>
      <div className={s.tocLabel}>Contents</div>
      <ul className={s.tocList}>
        {SECTIONS.map((sec) => (
          <li key={sec.id}>
            <a className={s.tocItem} href={`#${sec.id}`}>
              <span className={s.tocNum}>{sec.n}</span>
              <span>{sec.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className={s.tocLabel}>Appendix</div>
      <ul className={s.tocList}>
        {APPENDIX.map((a) => (
          <li key={a.id}>
            <a className={s.tocItem} href={`#${a.id}`}>
              <span className={s.tocNum}>{a.n}</span>
              <span>{a.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const THEME_OPTIONS = [
  { value: 'system', label: 'Match system', icon: <Desktop size={15} weight="bold" /> },
  { value: 'light', label: 'Light', icon: <Sun size={15} weight="bold" /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={15} weight="bold" /> },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <SegmentedControl
      aria-label="Theme"
      options={THEME_OPTIONS}
      value={theme}
      onChange={(v) => setTheme(v as ThemeChoice)}
    />
  );
}

export function Showcase() {
  const [cvd, setCvd] = useState<CvdMode>('off');
  const [brand, setBrand] = useState(false);
  const toasts = useToastManager();

  return (
    <div id={CVD_ID}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="deutan">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0 0.700 0.300 0 0 0 0 0.300 0.700 0 0 0 0 0 1 0"
            />
          </filter>
          <filter id="protan">
            <feColorMatrix
              type="matrix"
              values="0.152 1.053 -0.205 0 0 0.115 0.786 0.099 0 0 -0.004 -0.048 1.052 0 0 0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
      <div className={s.page}>
        <div className={s.hero}>
          <div className={s.heroTop}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-5)' }}>
              <svg width="34" height="24" viewBox="0 0 34 28" fill="none">
                <circle cx="7" cy="14" r="8" fill="var(--c-yellow)" opacity="0.85" />
                <circle cx="17" cy="14" r="8" fill="var(--c-grellow)" opacity="0.85" />
                <circle cx="27" cy="14" r="8" fill="var(--c-ocean)" opacity="0.85" />
              </svg>
              <div className={s.heroLabelGroup}>
                <span className={s.heroLabel}>KBase</span>
                <span className={s.heroLabelMono}>design system</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-4)' }}>
              <ThemeToggle />
              <button
                className={s.brandToggle}
                aria-pressed={brand}
                onClick={() => {
                  setBrand(!brand);
                  applyBrand(!brand);
                }}
                title="Swap in a fictional partner's colors. Every token it sets is one tokens.css would otherwise derive."
              >
                {brand ? 'KBase palette' : 'example brand'}
              </button>
              <button
                className={s.cvdToggle}
                onClick={() => {
                  const next: CvdMode =
                    cvd === 'off' ? 'deutan' : cvd === 'deutan' ? 'protan' : 'off';
                  setCvd(next);
                  applyCvdFilter(next);
                }}
              >
                {cvd === 'off' ? 'deuteranopia' : cvd === 'deutan' ? 'protanopia' : 'reset'}
              </button>
            </div>
          </div>
          <h1 className={s.heroHeadline}>
            Warm, data-literate,
            <br />
            quietly modern.
          </h1>
          <p className={s.heroTagline}>
            A design language for scientific discovery. Biology-inspired color. Oxygen type.
            Interface that recedes so the science doesn't.
          </p>
        </div>

        <PackageCallout />
        <TableOfContents />

        <div id="sec-00">
          <Section00InContext />
        </div>
        <div id="sec-01">
          <Section01Tokens />
        </div>
        <div id="sec-02">
          <Section02Color />
        </div>
        <div id="sec-03">
          <Section03Typography />
        </div>
        <div id="sec-04">
          <Section04Forms />
        </div>
        <div id="sec-05">
          <Section05Actions />
        </div>
        <div id="sec-06">
          <Section06Feedback cvd={cvd} />
        </div>
        <div id="sec-07">
          <Section07Data />
        </div>
        <div id="sec-08">
          <Section08Overlays
            onShowToast={() =>
              toasts.add({
                title: 'Assembly complete',
                description: '12,847 contigs assembled. N50: 8,241 bp.',
                timeout: 5000,
              })
            }
          />
        </div>
        <div id="sec-09">
          <Section09Layout />
        </div>
        <div id="sec-10">
          <Section10Icons />
        </div>
        <div id="sec-11">
          <Section11Implementation />
        </div>
        <div id="sec-12">
          <Section12Navigation />
        </div>

        <div id="app-data-explorer">
          <DataExplorerAppendix />
        </div>
        <div id="app-jobs-notifications">
          <JobsNotificationsAppendix />
        </div>
        <div id="app-app-catalog">
          <AppCatalogAppendix />
        </div>
        <div id="app-object-viewer">
          <ObjectViewerAppendix />
        </div>
        <div id="app-chat">
          <ChatAppendix />
        </div>
        <div id="app-project">
          <ProjectAppendix />
        </div>

        <hr className={s.divider} />
        <div className={s.vibesGrid}>
          {[
            ['Warm, not gray', 'Brown undertones. The cream ground is the brand.'],
            ['Color + shape + label', 'Never color alone. CVD-safe by design.'],
            ["Mono is data's voice", 'Refs, sizes, IDs, code. It earns its place.'],
            ['Dense, not dramatic', '22px headings. 15px body. Science app.'],
            ['Glow, not outline', 'Focus is a soft primary glow.'],
            ['Prompt-native', 'A first-class composer for search and AI.'],
          ].map(([title, desc]) => (
            <div key={title}>
              <div className="h4" style={{ marginBottom: 'var(--s-1)' }}>
                {title}
              </div>
              <div className="note">{desc}</div>
            </div>
          ))}
        </div>

        <div className={s.footer}>
          <svg
            width="24"
            height="16"
            viewBox="0 0 34 28"
            fill="none"
            style={{ marginBottom: 'var(--s-3)' }}
          >
            <circle cx="7" cy="14" r="8" fill="var(--c-yellow)" opacity="0.7" />
            <circle cx="17" cy="14" r="8" fill="var(--c-grellow)" opacity="0.7" />
            <circle cx="27" cy="14" r="8" fill="var(--c-ocean)" opacity="0.7" />
          </svg>
          <div className={s.mono}>kbase design system · 2026</div>
        </div>
      </div>
    </div>
  );
}
