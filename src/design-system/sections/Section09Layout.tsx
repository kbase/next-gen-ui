import { useState } from 'react';
import {
  ArrowClockwise,
  ArrowsOut,
  CaretDown,
  Columns,
  DownloadSimple,
  FunnelSimple,
} from '@phosphor-icons/react';
import s from './showcase.module.scss';
import { Frame } from '../components/Frame';
import { Accordion } from '../components/Accordion';
import * as Collapsible from '../components/Collapsible';
import * as Toolbar from '../components/Toolbar';
import { Avatar } from '../components/Avatar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CodeBlock } from '../components/CodeBlock';

export function Section09Layout() {
  const [showMethod, setShowMethod] = useState(false);

  return (
    <div className={s.section}>
      <div className={s.sNum}>09</div>
      <div className={s.sTitle}>Structure</div>
      <p className={s.sDesc}>
        The pieces that frame content: collapsible sections, control strips, user identity, and
        navigation context.
      </p>

      <div className={s.sub}>Accordion</div>
      <p className={s.note}>
        Wraps Base UI Collapsible. <code>defaultOpen</code> starts expanded. Use inside Frame with
        horizontal padding for panel-style grouping.
      </p>
      <Frame>
        <div style={{ padding: '0 var(--s-8)' }}>
          <Accordion title={<span className="caption">Assembly parameters</span>} defaultOpen>
            <span className="body">
              MEGAHIT v1.2.9 with default parameters. Min contig length: 200 bp. K-list: 21, 29, 39,
              59, 79, 99, 119, 141.
            </span>
          </Accordion>
          <Accordion title={<span className="caption">Quality metrics</span>}>
            <span className="body">
              N50: 8,241 bp. Total: 48.2 Mb. GC: 52.3%. CheckM completeness: 94.2%.
            </span>
          </Accordion>
        </div>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Accordion title={<span className="caption">Assembly parameters</span>} defaultOpen>
  <span className="body">Content here.</span>
</Accordion>`}
      />

      <div className={s.sub}>Collapsible</div>
      <p className={s.note}>
        The same Base UI part with the trigger left to the caller, for disclosures that are not a
        titled section. The panel animates its height. Keep the panel immediately after the trigger
        so a screen reader reaches the revealed content by moving forward.
      </p>
      <Frame style={{ padding: 'var(--s-7) var(--s-8)' }}>
        <Collapsible.Root
          open={showMethod}
          onOpenChange={setShowMethod}
          style={{ display: 'grid', justifyItems: 'start', gap: 'var(--s-4)' }}
        >
          <p className="body" style={{ maxWidth: '68ch' }}>
            Assembled with MEGAHIT v1.2.9. 4,355 contigs, N50 8,241 bp.
          </p>
          <Collapsible.Trigger>
            {showMethod ? 'Hide parameters' : 'Show parameters'}
            <CaretDown
              size={12}
              style={{
                transform: showMethod ? 'rotate(180deg)' : undefined,
                transition: 'transform var(--t-base)',
              }}
            />
          </Collapsible.Trigger>
          <Collapsible.Panel>
            <p className="body" style={{ maxWidth: '68ch' }}>
              Reads trimmed with fastp. Minimum contig length 200 bp. K-list 21, 29, 39, 59, 79, 99,
              119, 141. Binned with MetaBAT2 and scored with CheckM2.
            </p>
          </Collapsible.Panel>
        </Collapsible.Root>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Collapsible.Root open={open} onOpenChange={setOpen}>
  <p className="body">The summary that is always shown.</p>
  <Collapsible.Trigger>
    {open ? 'Hide parameters' : 'Show parameters'}
  </Collapsible.Trigger>
  <Collapsible.Panel>
    <p className="body">The detail that is not.</p>
  </Collapsible.Panel>
</Collapsible.Root>`}
      />

      <div className={s.sub}>Toolbar</div>
      <p className={s.note}>
        One tab stop; arrow keys move between the controls. Toolbar.Button renders a ghost Button
        unless <code>render</code> says otherwise. Group what belongs together and separate the
        groups.
      </p>
      <Frame style={{ padding: 'var(--s-4) var(--s-5)' }}>
        <Toolbar.Root aria-label="Table controls">
          <Toolbar.Group>
            <Toolbar.Button>
              <DownloadSimple size={14} /> Export
            </Toolbar.Button>
            <Toolbar.Button>
              <FunnelSimple size={14} /> Filter
            </Toolbar.Button>
            <Toolbar.Button>
              <Columns size={14} /> Columns
            </Toolbar.Button>
          </Toolbar.Group>
          <Toolbar.Separator />
          <Toolbar.Group>
            <Toolbar.Button aria-label="Refresh">
              <ArrowClockwise size={14} />
            </Toolbar.Button>
            <Toolbar.Button aria-label="Full screen">
              <ArrowsOut size={14} />
            </Toolbar.Button>
          </Toolbar.Group>
        </Toolbar.Root>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Toolbar.Root aria-label="Table controls">
  <Toolbar.Group>
    <Toolbar.Button>Export</Toolbar.Button>
    <Toolbar.Button>Filter</Toolbar.Button>
  </Toolbar.Group>
  <Toolbar.Separator />
  <Toolbar.Group>
    <Toolbar.Button aria-label="Refresh">
      <ArrowClockwise size={14} />
    </Toolbar.Button>
  </Toolbar.Group>
</Toolbar.Root>`}
      />

      <div className={s.sub}>Avatar</div>
      <p className={s.note}>
        Sizes: 20 (dense metadata), 24 (inline), 28 (table rows), 32 (default), 40 (profile), 64 /
        80 (hero cards). Optional <code>color</code> prop for multi-participant contexts: primary
        (default), teal, ocean, green, purple, orange, red.
      </p>
      <div className={s.row} style={{ alignItems: 'center', marginBottom: 'var(--s-7)' }}>
        <Avatar size={20} initials="JD" />
        <Avatar size={24} initials="JD" />
        <Avatar size={28} initials="AS" color="ocean" />
        <Avatar size={32} initials="AS" color="teal" />
        <Avatar size={40} initials="MK" color="purple" />
        <Avatar size={64} initials="ER" color="red" />
        <Avatar size={80} initials="DL" color="primary" />
      </div>
      <CodeBlock
        language="tsx"
        code={`<Avatar size={20} initials="JD" />            // dense metadata
<Avatar size={24} initials="JD" />            // inline (lists, mentions)
<Avatar size={28} initials="AS" color="ocean" />
<Avatar size={32} initials="AS" color="teal" />
<Avatar size={40} src="/photo.jpg" alt="M. Kim" />
<Avatar size={80} initials="DL" color="primary" />  // profile / hero card`}
      />

      <div className={s.sub}>Shape: circle vs square</div>
      <p className={s.note}>
        Default <code>circle</code> is for people. Use <code>shape="square"</code> for non-person
        identity: tenants, tools, threads, services. Shape signals "this is not a human"; color
        stays available as the differentiator.
      </p>
      <div className={s.row} style={{ alignItems: 'center' }}>
        <Avatar shape="square" size={24} initials="KB" color="primary" />
        <Avatar shape="square" size={32} initials="JL" color="teal" />
        <Avatar shape="square" size={40} initials="DB" color="purple" />
      </div>
      <CodeBlock
        language="tsx"
        code={`<Avatar shape="square" size={32} initials="JL" color="teal" />  // tenant, tool, or service`}
      />

      <div className={s.sub}>Variants: solid vs tint</div>
      <p className={s.note}>
        <code>solid</code> (default) is saturated background + white text + sans, for people and
        identity. <code>tint</code> is washed background + tint-contrast text + mono, for data-type
        abbreviations. TypeBadge is the canonical preset; reach for it before building a new tint
        Avatar.
      </p>
      <div className={s.row} style={{ alignItems: 'center' }}>
        <Avatar variant="solid" size={32} initials="JD" color="primary" />
        <Avatar variant="tint" shape="square" size={32} initials="GE" color="primary" />
        <Avatar variant="tint" shape="square" size={32} initials="TX" color="green" />
        <Avatar variant="tint" shape="square" size={32} initials="AS" color="purple" />
      </div>
      <CodeBlock
        language="tsx"
        code={`<Avatar variant="solid" initials="JD" color="primary" />
<Avatar variant="tint" shape="square" initials="GE" color="primary" />
// for data-type abbreviations, prefer TypeBadge (a preset)
<TypeBadge color="primary">GE</TypeBadge>`}
      />

      <div className={s.sub}>Breadcrumbs</div>
      <p className={s.note}>
        Last item has no <code>href</code>; it renders as plain text (current page).
      </p>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', href: '#' },
          { label: 'Soil Analysis', href: '#' },
          { label: 'Assembly Results' },
        ]}
      />
      <CodeBlock
        language="tsx"
        code={`<Breadcrumbs items={[
  { label: 'Workspaces', href: '/workspaces' },
  { label: 'Soil Analysis', href: '/ws/45221' },
  { label: 'Assembly Results' },  // current page, no href
]} />`}
      />
    </div>
  );
}
