import s from './showcase.module.scss';
import { Button, ButtonLink } from '../components/Button';
import { CopyButton } from '../components/CopyButton';
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
        Most actions are low-contrast. The primary fill is rare, reserved for the one thing the user
        came to do.
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
        Teal is for positive secondary actions such as share and publish. Purple is for discovery
        and exploration; it carries similar weight to primary without claiming the main action.
        Danger has a red border and red text but no fill, so it only fills on hover.
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
        The link variant is underlined at rest, not on hover: a link marked only by its color is not
        marked at all for a reader who does not see the color. It is also the one variant that drops
        the size padding, since it appears beside text rather than in a box of its own. Its label
        does not wrap, so keep it next to a paragraph rather than inside one &mdash; use the{' '}
        <code>.link</code> utility on a plain <code>&lt;a&gt;</code> for links in prose.
      </p>

      <div className={s.sub}>Sizes</div>
      <p className={s.note}>
        Three sizes: <code>md</code> (default), <code>sm</code>, and <code>xs</code>. Use{' '}
        <code>sm</code> in toolbars and table rows, <code>xs</code> in dense filter bars and inline
        metadata. Size and variant are independent.
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

      <div className={s.sub}>Copy button</div>
      <p className={s.note}>
        Writes <code>text</code> to the clipboard and confirms it. The component handles the whole
        confirmation: the icon, how long it shows, and the announcement. It uses{' '}
        <code>copy-to-clipboard</code>, because <code>navigator.clipboard</code> does not exist on
        insecure origins &mdash; including any dev server reached over http.
      </p>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)', alignItems: 'center' }}>
        <CopyButton
          text="s3://cdm-lake/users-general-warehouse/alice/"
          variant="outline"
          size="sm"
          label="Copy path"
        />
        <CopyButton
          text="s3://cdm-lake/users-general-warehouse/alice/"
          variant="ghost"
          size="sm"
          label="Copy path"
          iconOnly
        />
      </div>
      <CodeBlock
        language="tsx"
        code={`<CopyButton text={path} label="Copy path" variant="outline" size="sm" />
<CopyButton text={path} label="Copy path" variant="ghost" size="sm" iconOnly />`}
      />
      <p className={s.note}>
        The icon is <code>aria-hidden</code>, so the result is also announced in a polite live
        region. A failed copy shows <code>XCircle</code> and says so: silence is indistinguishable
        from a dead button. <code>label</code> is required, because a button is operable and always
        needs a name; <code>iconOnly</code> hides the words and keeps it. Takes Button's{' '}
        <code>variant</code>, <code>size</code>, and its other props.
      </p>

      <div className={s.sub}>Segmented control</div>
      <p className={s.note}>
        One choice from a short, always-visible set &mdash; a view, a time range. It is a radio
        group: one tab stop, and the arrow keys move between segments. An icon-only segment takes
        its accessible name from <code>label</code>, and the group itself needs an{' '}
        <code>aria-label</code> unless a visible label points at it. Use <code>description</code> to
        explain an option the label has no room for; it is shown on hover. Use <code>disabled</code>{' '}
        for an option that is not currently available, such as a route with no API key configured. A
        disabled option is dimmed rather than removed, so the list does not change length.
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
        <SegmentedControl
          aria-label="Model route"
          value="direct"
          onChange={() => {}}
          options={[
            { value: 'direct', label: 'Direct', description: 'Your own API key, billed to you.' },
            {
              value: 'gateway',
              label: 'Gateway',
              description: 'No credential configured for the gateway yet.',
              disabled: true,
            },
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
/>

<SegmentedControl
  aria-label="Model route"
  value={route}
  onChange={setRoute}
  options={[
    { value: 'direct', label: 'Direct', description: 'Your own API key, billed to you.' },
    { value: 'gateway', label: 'Gateway', description: 'No credential configured yet.', disabled: true },
  ]}
/>`}
      />
    </div>
  );
}
