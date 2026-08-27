import s from './showcase.module.scss';
import { Alert } from '../components/Alert';
import { Loader } from '../components/Loader';
import { Progress } from '../components/Progress';
import { Skeleton } from '../components/Skeleton';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Frame } from '../components/Frame';
import { Chip } from '../components/Chip';
import { CodeBlock } from '../components/CodeBlock';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import {
  CheckCircle,
  CircleDashed,
  CircleNotch,
  Clock,
  Prohibit,
  Warning,
  XCircle,
  MagnifyingGlass,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { ChipColor } from '../components/Chip';

/* Illustrative only: the system ships no status list, so the showcase keeps its
   own the way a consuming app would. */
const EXAMPLE = {
  queued: { icon: Clock, label: 'Queued', color: 'primary' },
  running: { icon: CircleNotch, label: 'Running', color: 'primary' },
  complete: { icon: CheckCircle, label: 'Complete', color: 'green' },
  warning: { icon: Warning, label: 'Warning', color: 'yellow' },
  error: { icon: XCircle, label: 'Error', color: 'red' },
  canceled: { icon: Prohibit, label: 'Canceled', color: 'orange' },
  unknown: { icon: CircleDashed, label: 'Unknown', color: 'neutral' },
} satisfies Record<string, { icon: Icon; label: string; color: ChipColor }>;

interface Section06FeedbackProps {
  cvd: string;
}

export function Section06Feedback({ cvd }: Section06FeedbackProps) {
  return (
    <div className={s.section}>
      <div className={s.sNum}>06</div>
      <div className={s.sTitle}>Feedback</div>
      <p className={s.sDesc}>
        Alert for something that happened. Progress for something measurable. Skeleton while the
        shape is known but the data isn't. Loader when you can't predict either.
      </p>

      <div className={s.sub}>Status</div>
      <p className={s.note}>
        A state is a shape first and a color second. Green and red are the pair a color-blind reader
        loses first, so a colored dot on its own tells them nothing: the icon carries the meaning
        and the color reinforces it. Switch the filter at the top of this page to deuteranopia: the
        states below still read.
      </p>
      <p className={s.note}>
        There is no status component and no list of states, because states belong to whatever is
        being reported on &mdash; a job, a connection, a validation. A status is a <code>Chip</code>
        : boxed where it is a badge, <code>bare</code> where it is inline. Keep the states in one
        map in your app, so a new one cannot arrive without an icon &mdash; and so the whole set is
        in one place to check that no two share a shape.
      </p>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)' }}>
        {(Object.keys(EXAMPLE) as (keyof typeof EXAMPLE)[]).map((k) => (
          <Chip key={k} color={EXAMPLE[k].color} icon={EXAMPLE[k].icon} label={EXAMPLE[k].label} />
        ))}
      </div>
      <CodeBlock
        language="tsx"
        code={`// In your app, not the design system.
const STATUS = {
  queued:   { icon: Clock,        label: 'Queued',   color: 'primary' },
  running:  { icon: CircleNotch,  label: 'Running',  color: 'primary' },
  complete: { icon: CheckCircle,  label: 'Complete', color: 'green' },
  error:    { icon: XCircle,      label: 'Error',    color: 'red' },
  unknown:  { icon: CircleDashed, label: 'Unknown',  color: 'neutral' },
} satisfies Record<string, { icon: Icon; label: string; color: ChipColor }>;

const { icon, label, color } = STATUS[state];

<Chip color={color} icon={icon} label={label} />
<Chip color={color} icon={icon} bare label={label} />`}
      />
      <p className={s.note}>
        Where a row is too tight for the word, add <code>iconOnly</code> &mdash; the name stays. For
        a running spinner use <code>Loader</code> below; it is the only one in the system. Chip's
        own props are documented in section 07.
      </p>

      <div className={s.sub}>Alert</div>
      <p className={s.note}>
        Four semantic colors. Optional <code>trace</code> for collapsible detail (stack traces, long
        messages). Optional <code>actions</code> for recovery links styled in the alert's color.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 540 }}>
        <Alert color="green" icon={<CheckCircle size={16} weight="bold" />}>
          <strong>Complete.</strong> Genome annotation finished. 4,639 features.
        </Alert>
        <Alert color="primary" icon={<Clock size={16} weight="bold" />}>
          <strong>Queued.</strong> Position 3. Estimated start in ~4 minutes.
        </Alert>
        <Alert color="yellow" icon={<Warning size={16} weight="bold" />}>
          <strong>Unsaved.</strong> Last saved 30 minutes ago.
        </Alert>
        <Alert
          color="red"
          icon={<XCircle size={16} weight="bold" />}
          trace={`subprocess.CalledProcessError: exit status 137`}
          actions={
            <>
              <Button variant="link" size="sm" onClick={() => {}}>
                <ArrowCounterClockwise size={12} /> Retry
              </Button>
            </>
          }
        >
          <strong>Failed.</strong> Assembly exceeded memory limit.
        </Alert>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Alert color="red" icon={<XCircle size={16} weight="bold" />}
  trace={stackTrace}
  actions={<Button variant="link" size="sm" onClick={retry}>
    <ArrowCounterClockwise size={12} /> Retry
  </Button>}
>
  <strong>Failed.</strong> Assembly exceeded memory limit.
</Alert>`}
      />

      <div className={s.sub}>Progress</div>
      <p className={s.note}>
        Determinate bar. <code>color</code> accepts primary, green, yellow, red, purple.
      </p>
      <Frame padding={8}>
        <div className="h4" style={{ marginBottom: 'var(--s-2)' }}>
          Annotation pipeline
        </div>
        <div className="note" style={{ marginBottom: 'var(--s-6)' }}>
          3 of 4 stages complete
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-5)' }}>
            <span
              className={s.stageLabel}
              style={{ fontSize: 'var(--fs-4)', color: 'var(--c-ink3)' }}
            >
              Assembly
            </span>
            <div style={{ flex: 1 }}>
              <Progress value={100} color="green" />
            </div>
            <span className="mono-secondary">done</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-5)' }}>
            <span
              className={s.stageLabel}
              style={{ fontSize: 'var(--fs-4)', color: 'var(--c-ink3)' }}
            >
              Annotation
            </span>
            <div style={{ flex: 1 }}>
              <Progress value={68} />
            </div>
            <span className="mono-secondary">68%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-5)' }}>
            <span className={`note ${s.stageLabel}`}>Upload</span>
            <div style={{ flex: 1 }}>
              <Progress value={0} />
            </div>
            <span className="mono-secondary">waiting</span>
          </div>
        </div>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Progress value={68} />           // primary (default)
<Progress value={100} color="green" />  // completed stage`}
      />

      <div className={s.sub}>Skeleton</div>
      <p className={s.note}>
        Three variants: text (default), circular for avatars, rectangular for blocks. The shimmer
        animates on its own.
      </p>
      <Frame>
        <div
          style={{
            display: 'flex',
            gap: 'var(--s-5)',
            alignItems: 'center',
            marginBottom: 'var(--s-6)',
          }}
        >
          <Skeleton variant="circular" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <Skeleton width="45%" />
            <Skeleton width="30%" />
          </div>
        </div>
        <Skeleton variant="rectangular" height={48} />
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Skeleton />                          // text line
<Skeleton variant="circular" />       // avatar placeholder
<Skeleton variant="rectangular" height={48} />  // block`}
      />

      <div className={s.sub}>Loader</div>
      <p className={s.note}>
        The mini-logo&apos;s three dots, braided: each traces the same figure-eight a third of a lap
        apart, sized by depth. Under reduced motion it runs smaller and slower, without the turn.
        The circles composite where they overlap, so the blend follows the theme background; on a
        surface that is not the theme background &mdash; a brand fill, an image &mdash; set{' '}
        <code>blend</code> explicitly. Inline at size 14, standalone at 36 and above.
      </p>
      <div className={s.row}>
        <div className={s.cell} style={{ width: 80, height: 80 }}>
          <Loader size={36} svgFilter={cvd !== 'off' ? `url(#${cvd})` : undefined} />
        </div>
        <div className={`${s.cell} ${s.cellDark}`} style={{ width: 80, height: 80 }}>
          <Loader size={36} svgFilter={cvd !== 'off' ? `url(#${cvd})` : undefined} />
        </div>
        <div className={`${s.cell} ${s.cellFixed}`} style={{ width: 80, height: 80 }}>
          <Loader size={36} blend="screen" svgFilter={cvd !== 'off' ? `url(#${cvd})` : undefined} />
        </div>
        <div className={s.cellInline}>
          <Loader size={14} svgFilter={cvd !== 'off' ? `url(#${cvd})` : undefined} />
          <span className={s.inlineLabel}>Loading workspace...</span>
        </div>
      </div>

      <CodeBlock
        language="tsx"
        code={`<Loader size={36} />                    // standalone, follows the theme
<Loader size={36} blend="screen" />     // on a brand fill or an image
<Loader size={14} />                    // inline with text`}
      />

      <div className={s.sub}>Empty state</div>
      <p className={s.note}>
        Icon + title + description + optional action. For empty tables, no-results search, 404s.
      </p>
      <Frame padding={0} style={{ maxWidth: 400 }}>
        <EmptyState
          icon={<MagnifyingGlass size={32} />}
          title="No objects match"
          description="Try adjusting your search or filters."
          action={<Button variant="outline">Clear filters</Button>}
        />
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<EmptyState
  icon={<MagnifyingGlass size={32} />}
  title="No objects match"
  description="Try adjusting your search or filters."
  action={<Button variant="outline">Clear filters</Button>}
/>`}
      />

      <div className={s.sub}>Error patterns</div>
      <p className={s.note}>Errors aren't a component. Each context picks its own primitives.</p>
      <Table>
        <Thead>
          <Tr>
            <Th>Context</Th>
            <Th>Components</Th>
            <Th>Recovery</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>Field validation</Td>
            <Td>Field.Error</Td>
            <Td>Fix input</Td>
          </Tr>
          <Tr>
            <Td>Job failure</Td>
            <Td>Alert (red) + trace</Td>
            <Td>Retry, support</Td>
          </Tr>
          <Tr>
            <Td>Viewer tab error</Td>
            <Td>Alert (red) inline</Td>
            <Td>Reload</Td>
          </Tr>
          <Tr>
            <Td>Service warning</Td>
            <Td>Alert (yellow)</Td>
            <Td>Dismiss</Td>
          </Tr>
          <Tr>
            <Td>Transient failure</Td>
            <Td>Toast (red)</Td>
            <Td>Auto-dismiss</Td>
          </Tr>
          <Tr>
            <Td>Row-level error</Td>
            <Td>Chip (red) + icon</Td>
            <Td>Expand row</Td>
          </Tr>
          <Tr>
            <Td>Full page (404)</Td>
            <Td>EmptyState or Alert centered</Td>
            <Td>Navigate away</Td>
          </Tr>
          <Tr>
            <Td>Dialog failure</Td>
            <Td>Alert (red) in dialog</Td>
            <Td>Retry, cancel</Td>
          </Tr>
          <Tr>
            <Td>Notification</Td>
            <Td>NotificationFeed item</Td>
            <Td>Link to source</Td>
          </Tr>
          <Tr>
            <Td>Job state change</Td>
            <Td>Toast + NotificationFeed</Td>
            <Td>View job</Td>
          </Tr>
        </Tbody>
      </Table>
    </div>
  );
}
