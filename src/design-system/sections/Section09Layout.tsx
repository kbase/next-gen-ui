import { useState } from 'react';
import {
  ArrowClockwise,
  ArrowsOut,
  Columns,
  DownloadSimple,
  FunnelSimple,
} from '@phosphor-icons/react';
import s from './showcase.module.scss';
import { Frame } from '../components/Frame';
import * as Accordion from '../components/Accordion';
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
        The pieces that frame content: the surface itself, collapsible sections, control strips,
        user identity, and navigation context.
      </p>

      <div className={s.sub}>Frame</div>
      <p className={s.note}>
        A surface: background, border, radius, and padding from the spacing scale.{' '}
        <code>padding</code> defaults to 7; <code>paddingX</code> and <code>paddingY</code> override
        one axis. <code>padding={'{0}'}</code> for a frame whose children run to the edge, like a
        table or a list.
      </p>
      <div className={s.row} style={{ alignItems: 'stretch', marginBottom: 'var(--s-7)' }}>
        <Frame accent="primary" style={{ maxWidth: 240 }}>
          <div className="h3">Assembly</div>
          <p className={s.note} style={{ margin: 0 }}>
            Accent groups this card with the others in its category.
          </p>
        </Frame>
        <Frame accent="purple" style={{ maxWidth: 240 }}>
          <div className="h3">Annotation</div>
          <p className={s.note} style={{ margin: 0 }}>
            A different category, so a different outline &mdash; and a different title.
          </p>
        </Frame>
      </div>
      <CodeBlock language="tsx" code={`<Frame accent="primary" padding={7}>…</Frame>`} />
      <p className={s.note}>
        <code>accent</code> colours the frame's own border, for grouping or categorising. The whole
        outline reads as one object; a stripe down one edge reads as a marker stuck onto it, which
        is a different claim. It may carry meaning; it may not carry it <em>alone</em> &mdash; the
        card must say the same thing in its content, because a reader who does not see the hue sees
        an ordinary border. That is also why it is a prop on Frame rather than a component of its
        own: it is decoration that reinforces, not the thing doing the work. For state rather than
        category, reach for a status Chip in section 06.
      </p>

      <div className={s.sub}>Accordion</div>
      <p className={s.note}>
        Sections whose triggers are their titles; each renders as a heading. Arrow keys move between
        them. <code>defaultValue</code> lists the items that start open; pass{' '}
        <code>multiple={'{false}'}</code> to open one at a time. <code>summary</code> shows on the
        trigger in both states.
      </p>
      <Frame paddingY={0} paddingX={8}>
        <Accordion.Root defaultValue={['params']}>
          <Accordion.Item
            value="params"
            title={<span className="caption">Assembly parameters</span>}
            summary="MEGAHIT v1.2.9"
          >
            <span className="body">
              Default parameters. Min contig length: 200 bp. K-list: 21, 29, 39, 59, 79, 99, 119,
              141.
            </span>
          </Accordion.Item>
          <Accordion.Item
            value="quality"
            title={<span className="caption">Quality metrics</span>}
            summary="94.2% complete"
          >
            <span className="body">N50: 8,241 bp. Total: 48.2 Mb. GC: 52.3%.</span>
          </Accordion.Item>
        </Accordion.Root>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Accordion.Root defaultValue={['params']}>
  <Accordion.Item
    value="params"
    title={<span className="caption">Assembly parameters</span>}
    summary="MEGAHIT v1.2.9"
  >
    <span className="body">Content here.</span>
  </Accordion.Item>
  <Accordion.Item value="quality" title={<span className="caption">Quality metrics</span>}>
    <span className="body">More content.</span>
  </Accordion.Item>
</Accordion.Root>`}
      />

      <div className={s.sub}>Collapsible</div>
      <p className={s.note}>
        A section whose trigger is a control, not a title. Styled text, in the flow of the copy it
        expands, no heading. Use Accordion when the trigger titles the section.
      </p>
      <Frame paddingY={7} paddingX={8}>
        <Collapsible.Root open={showMethod} onOpenChange={setShowMethod}>
          <p className="body" style={{ maxWidth: '68ch' }}>
            Assembled with MEGAHIT v1.2.9. 4,355 contigs, N50 8,241 bp.{' '}
            <Collapsible.Trigger>
              {showMethod ? 'Fewer details' : 'More details'}
            </Collapsible.Trigger>
          </p>
          <Collapsible.Panel>
            <p className="body" style={{ maxWidth: '68ch', paddingTop: 'var(--s-4)' }}>
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
      <Frame paddingY={4} paddingX={5}>
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
