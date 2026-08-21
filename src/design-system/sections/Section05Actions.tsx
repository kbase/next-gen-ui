import s from './showcase.module.scss';
import { Button, ButtonLink } from '../components/Button';
import { SegmentedControl } from '../components/SegmentedControl';
import { CodeBlock } from '../components/CodeBlock';
import {
  Play,
  Copy,
  Trash,
  ShareNetwork,
  Table as TableIcon,
  SquaresFour,
  List,
  ArrowSquareOut,
} from '@phosphor-icons/react';

export function Section05Actions() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>05</div>
      <div className={s.sTitle}>Actions</div>
      <p className={s.sDesc}>
        Most actions are quiet. Primary fill is rare, reserved for the one thing the user came to
        do.
      </p>

      <div className={s.sub}>Button</div>
      <p className={s.note}>
        Seven variants. Default to ghost or outline. Primary is for the main action on the page.
      </p>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)' }}>
        <Button variant="primary">
          <Play size={14} weight="bold" /> Run analysis
        </Button>
        <Button variant="outline">
          <Copy size={14} /> Duplicate
        </Button>
        <Button variant="ghost">Cancel</Button>
      </div>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)' }}>
        <Button variant="teal">
          <ShareNetwork size={14} weight="bold" /> Share
        </Button>
        <Button variant="purple">Discover</Button>
        <Button variant="danger">
          <Trash size={14} /> Delete
        </Button>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Button variant="primary"><Play size={14} weight="bold" /> Run analysis</Button>
<Button variant="outline"><Copy size={14} /> Duplicate</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="teal"><ShareNetwork size={14} weight="bold" /> Share</Button>
<Button variant="purple">Discover</Button>
<Button variant="danger"><Trash size={14} /> Delete</Button>`}
      />
      <p className={s.note}>
        Teal is for positive secondary actions (share, publish). Purple is reserved for
        discovery/exploration affordances; it sits next to primary in weight without competing for
        "the main action." Danger gets a red border and text, no fill, so it doesn't scream until
        hovered.
      </p>

      <div className={s.sub}>Buttons that are links, links that are buttons</div>
      <p className={s.note}>
        Two different things, and the difference is what happens on click. <code>link</code> is a
        variant of Button: it looks like a link and runs code. <code>ButtonLink</code> is an anchor:
        it looks like a button and navigates &mdash; so it opens in a new tab on middle-click, has a
        URL to copy, and is announced as a link.
      </p>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)', alignItems: 'center' }}>
        <Button variant="link" onClick={() => {}}>
          Show advanced options
        </Button>
        <Button variant="link" size="sm" onClick={() => {}}>
          Reset filters
        </Button>
        <ButtonLink variant="outline" href="https://base-ui.com" target="_blank" rel="noreferrer">
          Base UI docs <ArrowSquareOut size={14} />
        </ButtonLink>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Button variant="link" onClick={reset}>Reset filters</Button>
<ButtonLink variant="outline" href="/docs">Documentation</ButtonLink>`}
      />
      <p className={s.note}>
        The link variant is underlined at rest, not on hover: a link marked only by its colour is
        not marked at all for a reader who does not see the colour. It is also the one variant that
        drops the size padding, since it sits beside text rather than in a box of its own. Its label
        will not wrap, so it sits beside a paragraph rather than inside one &mdash; use the{' '}
        <code>.link</code> utility on a plain <code>&lt;a&gt;</code> for links in prose.
      </p>

      <div className={s.sub}>Sizes</div>
      <p className={s.note}>
        Three sizes: <code>md</code> (default), <code>sm</code>, and <code>xs</code>. Drop to{' '}
        <code>sm</code> in toolbars and table rows; reach for <code>xs</code> in dense filter bars
        and inline metadata. Sizing is orthogonal to variant.
      </p>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)', alignItems: 'center' }}>
        <Button size="md" variant="primary">
          Default
        </Button>
        <Button size="sm" variant="primary">
          Small
        </Button>
        <Button size="xs" variant="primary">
          Extra small
        </Button>
      </div>
      <div className={s.row}>
        <Button size="sm" variant="outline">
          <Copy size={12} /> Duplicate
        </Button>
        <Button size="sm" variant="ghost">
          Cancel
        </Button>
        <Button size="xs" variant="outline">
          Filter
        </Button>
        <Button size="xs" variant="ghost">
          Reset
        </Button>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Button size="md" variant="primary">Default</Button>
<Button size="sm" variant="primary">Small</Button>
<Button size="xs" variant="primary">Extra small</Button>

<Button size="sm" variant="outline"><Copy size={12} /> Duplicate</Button>
<Button size="sm" variant="ghost">Cancel</Button>
<Button size="xs" variant="outline">Filter</Button>
<Button size="xs" variant="ghost">Reset</Button>`}
      />

      <div className={s.sub}>Segmented control</div>
      <p className={s.note}>
        One choice from a short, always-visible set &mdash; a view, a time range. It is a radio
        group: one tab stop, and the arrow keys move between segments. An icon-only segment takes
        its accessible name from <code>label</code>, and the group itself needs an{' '}
        <code>aria-label</code> unless a visible label points at it.
      </p>
      <div className={s.row}>
        <SegmentedControl
          aria-label="Layout"
          value="table"
          onChange={() => {}}
          options={[
            { value: 'table', icon: <TableIcon size={14} />, label: 'Table' },
            { value: 'grid', icon: <SquaresFour size={14} />, label: 'Grid' },
            { value: 'list', icon: <List size={14} />, label: 'List' },
          ]}
        />
        <SegmentedControl
          aria-label="Time range"
          value="week"
          onChange={() => {}}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
      </div>
      <CodeBlock
        language="tsx"
        code={`<SegmentedControl
  aria-label="Layout"
  value={view}
  onChange={setView}
  options={[
    { value: 'table', icon: <TableIcon size={14} />, label: 'Table' },
    { value: 'grid', icon: <SquaresFour size={14} />, label: 'Grid' },
  ]}
/>`}
      />
    </div>
  );
}
