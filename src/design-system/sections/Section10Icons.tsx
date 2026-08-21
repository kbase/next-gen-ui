import s from './showcase.module.scss';
import { Chip } from '../components/Chip';
import { Frame } from '../components/Frame';
import { CodeBlock } from '../components/CodeBlock';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import {
  Archive,
  ArrowBendDownRight,
  ArrowClockwise,
  ArrowElbowDownRight,
  ArrowSquareOut,
  ArrowUp,
  ArrowsLeftRight,
  Bell,
  BookOpen,
  Brain,
  Circle,
  CircleDashed,
  CircleHalf,
  CircleNotch,
  Compass,
  Diamond,
  File,
  Files,
  Folder,
  Gear,
  Hexagon,
  Hourglass,
  Info,
  Lightning,
  ListDashes,
  Lock,
  Microscope,
  PencilSimple,
  PuzzlePiece,
  Plug,
  Plus,
  Prohibit,
  Question,
  Rows,
  Shuffle,
  Star,
  Tray,
  DotsSixVertical,
  ArrowCounterClockwise,
  CaretDown,
  CaretRight,
  Check,
  Copy,
  Database,
  DownloadSimple,
  Eye,
  MagnifyingGlass,
  PaperPlaneRight,
  ShareNetwork,
  SquaresFour,
  Trash,
  XCircle,
  CheckCircle,
  Clock,
  Warning,
  X,
  Play,
  Notebook,
  Dna,
  Leaf,
  Flask,
  TreeStructure,
  Atom,
  Bug,
  ChartBar,
  Table as TableIcon,
} from '@phosphor-icons/react';

export function Section10Icons() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>10</div>
      <div className={s.sTitle}>Icons</div>
      <p className={s.sDesc}>
        Phosphor icons, six weights. Weight carries meaning: regular for chrome, bold for emphasis,
        fill for active state.
      </p>

      <div className={s.sub}>Weight as state</div>
      <Frame paddingY={7} paddingX={8}>
        <div style={{ display: 'flex', gap: 'var(--s-9)', flexWrap: 'wrap' }}>
          {(
            [
              ['thin', 'var(--c-ink4)'],
              ['light', 'var(--c-ink3)'],
              ['regular', 'var(--c-ink2)'],
              ['bold', 'var(--c-ink)'],
              ['fill', 'var(--c-primary)'],
              ['duotone', 'var(--c-primary)'],
            ] as const
          ).map(([weight, color]) => (
            <div key={weight} style={{ textAlign: 'center' }}>
              <Notebook size={24} weight={weight} style={{ color }} />
              <div className={s.mono} style={{ marginTop: 'var(--s-2)' }}>
                {weight}
              </div>
            </div>
          ))}
        </div>
      </Frame>
      <Table>
        <Thead>
          <Tr>
            <Th>Weight</Th>
            <Th>When</Th>
            <Th>Example</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>regular</Td>
            <Td>Default chrome: toolbars, sidebars, inactive navigation</Td>
            <Td>
              <Notebook size={16} />
            </Td>
          </Tr>
          <Tr>
            <Td>bold</Td>
            <Td>Emphasis: buttons, status chip icons (size 9), important actions</Td>
            <Td>
              <Notebook size={16} weight="bold" />
            </Td>
          </Tr>
          <Tr>
            <Td>fill</Td>
            <Td>Active/selected state: current page, toggled-on controls</Td>
            <Td>
              <Notebook size={16} weight="fill" style={{ color: 'var(--c-primary)' }} />
            </Td>
          </Tr>
          <Tr>
            <Td>light</Td>
            <Td>Decorative or deemphasized: secondary indicators, watermarks</Td>
            <Td>
              <Notebook size={16} weight="light" style={{ color: 'var(--c-ink3)' }} />
            </Td>
          </Tr>
          <Tr>
            <Td>thin</Td>
            <Td>Rarely; very large decorative icons only</Td>
            <Td>
              <Notebook size={16} weight="thin" style={{ color: 'var(--c-ink4)' }} />
            </Td>
          </Tr>
          <Tr>
            <Td>duotone</Td>
            <Td>Illustrative: empty states, onboarding, marketing</Td>
            <Td>
              <Notebook size={16} weight="duotone" style={{ color: 'var(--c-primary)' }} />
            </Td>
          </Tr>
        </Tbody>
      </Table>
      <CodeBlock
        language="tsx"
        code={`// Navigation: regular idle, fill active
<Notebook size={17} />
<Notebook size={17} weight="fill" />

// Status chips: size 9, everything from your own status map
const { icon: Icon, label, color } = STATUS[state];
<Chip color={color} icon={Icon} label={label} />

// Button icons: bold at size 14
<Button variant="primary"><Play size={14} weight="bold" /> Run</Button>`}
      />

      <div className={s.sub}>Status chips</div>
      <p className={s.note}>
        Each status has its own icon shape, so the state reads without colour. Green and red are the
        pair colour-blind readers lose first &mdash; the icon has to carry the meaning, and the
        colour reinforces it. <code>XCircle</code> for error, not <code>X</code> &mdash; the
        glossary below is what settles that. Keep a set like this in one map rather than choosing an
        icon per call site &mdash; see section 06.
      </p>
      <div className={s.row}>
        <Chip color="primary" icon={CircleNotch} label="Running" />
        <Chip color="green" icon={CheckCircle} label="Complete" />
        <Chip color="red" icon={XCircle} label="Error" />
        <Chip color="yellow" icon={Warning} label="Warning" />
        <Chip color="primary" icon={Clock} label="Queued" />
      </div>

      <div className={s.sub}>Glossary</div>
      <p className={s.note}>
        One icon per meaning, across the system. Look a meaning up here before choosing an icon: two
        meanings sharing an icon is how a set stops being readable.
      </p>
      <Frame padding={0}>
        <Table compact>
          <Thead>
            <Tr>
              <Th style={{ width: 44 }}>Icon</Th>
              <Th>Means</Th>
              <Th>Not</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(
              [
                [
                  '\u2713',
                  <Check size={15} weight="bold" />,
                  'Confirmed, inline done',
                  'a finished job — CheckCircle',
                ],
                ['', <CheckCircle size={15} weight="bold" />, 'Complete, succeeded', ''],
                [
                  '\u2717',
                  <X size={15} weight="bold" />,
                  'Close, dismiss, clear',
                  'error — XCircle',
                ],
                ['\u2715', <XCircle size={15} weight="bold" />, 'Error, failed', 'close — X'],
                [
                  '\u26a0',
                  <Warning size={15} weight="bold" />,
                  'Warning, needs attention',
                  'error',
                ],
                [
                  '\u26d4',
                  <Prohibit size={15} weight="bold" />,
                  'Blocked, not permitted, canceled',
                  'error',
                ],
                ['\u25cf', <Circle size={15} weight="fill" />, 'Active', ''],
                ['\u25cb', <Circle size={15} weight="bold" />, 'Pending', ''],
                ['\u25d0', <CircleHalf size={15} weight="bold" />, 'Half done', ''],
                [
                  '\u25d4',
                  <CircleNotch size={15} weight="bold" />,
                  'Running, in progress',
                  'partial progress — CircleHalf',
                ],
                ['\u25cd', <CircleDashed size={15} weight="bold" />, 'Indeterminate', ''],
                [
                  '\u23f3',
                  <Hourglass size={15} weight="bold" />,
                  'Waiting',
                  'elapsed time — Clock',
                ],
                ['', <Clock size={15} weight="bold" />, 'Queued, scheduled', 'a running job'],
                ['\u25c6', <Diamond size={15} weight="fill" />, 'Marker, filled', ''],
                ['\u25c7', <Diamond size={15} weight="bold" />, 'Marker, empty', ''],
                ['\u{1f512}', <Lock size={15} weight="bold" />, 'Locked, private', ''],
                [
                  '\u25b8',
                  <CaretRight size={15} weight="bold" />,
                  'Collapsed disclosure',
                  'next page',
                ],
                [
                  '\u25be',
                  <CaretDown size={15} weight="bold" />,
                  'Expanded disclosure',
                  'sort descending',
                ],
                ['\u21b3', <ArrowElbowDownRight size={15} weight="bold" />, 'Nested, reply', ''],
                [
                  '\u2191',
                  <ArrowUp size={15} weight="bold" />,
                  'Promote, move up',
                  'sort ascending',
                ],
                ['\u283f', <DotsSixVertical size={15} weight="bold" />, 'Drag handle', ''],
                ['\u29c9', <SquaresFour size={15} weight="bold" />, 'Overview, grid view', ''],
                [
                  '\u25b6',
                  <Play size={15} weight="bold" />,
                  'Run, start',
                  'a running job — CircleNotch',
                ],
                ['\u27f3', <ArrowClockwise size={15} weight="bold" />, 'Refresh', 'retry'],
                ['\u21ba', <ArrowCounterClockwise size={15} weight="bold" />, 'Retry', 'undo'],
                ['\u2913', <DownloadSimple size={15} weight="bold" />, 'Download', 'import'],
                ['\u{1f4e5}', <Tray size={15} weight="bold" />, 'Ingest, inbox', 'download'],
                ['\u2197', <ArrowSquareOut size={15} weight="bold" />, 'External link', ''],
                ['\u{1f4cb}', <Copy size={15} weight="bold" />, 'Copy to clipboard', 'paste'],
                ['', <Trash size={15} weight="bold" />, 'Delete permanently', 'remove from a list'],
                ['', <ShareNetwork size={15} weight="bold" />, 'Share, publish', ''],
                ['\u{1f5c4}', <Archive size={15} weight="bold" />, 'Archive', 'delete'],
                ['\u2605', <Star size={15} weight="fill" />, 'Favourite', ''],
                ['\uff0b', <Plus size={15} weight="bold" />, 'Add', ''],
                ['\u270e', <PencilSimple size={15} weight="bold" />, 'Rename, edit', ''],
                ['\u2935', <ArrowBendDownRight size={15} weight="bold" />, 'Move, file under', ''],
                [
                  '\u21cc',
                  <ArrowsLeftRight size={15} weight="bold" />,
                  'Sync, both directions',
                  '',
                ],
                ['\u{1f500}', <Shuffle size={15} weight="bold" />, 'Route, reorder', ''],
                [
                  '\u{1f50e}',
                  <MagnifyingGlass size={15} weight="bold" />,
                  'Search, filter',
                  'zoom',
                ],
                ['', <PaperPlaneRight size={15} weight="bold" />, 'Send, submit', ''],
                ['', <Eye size={15} weight="bold" />, 'View, preview', 'a visibility toggle'],
                ['\u24d8', <Info size={15} weight="bold" />, 'Info', 'help — Question'],
                ['\uff1f', <Question size={15} weight="bold" />, 'Help', ''],
                ['\u{1f514}', <Bell size={15} weight="bold" />, 'Notifications', ''],
                ['\u2699', <Gear size={15} weight="bold" />, 'Settings', ''],
                ['\u26a1', <Lightning size={15} weight="bold" />, 'Activity', ''],
                ['\u{1f9ed}', <Compass size={15} weight="bold" />, 'Routing', 'navigation'],
                ['\u25a4', <TableIcon size={15} weight="bold" />, 'Table, dataset', ''],
                ['', <Rows size={15} weight="bold" />, 'Rows, dense list', 'a table'],
                ['\u2263', <ListDashes size={15} weight="bold" />, 'List', ''],
                ['', <Database size={15} weight="bold" />, 'Database, warehouse', 'a single table'],
                ['\u{1f5c2}', <Files size={15} weight="bold" />, 'Data, file set', ''],
                ['\u{1f4c1}', <Folder size={15} weight="bold" />, 'Folder', ''],
                ['\u{1f4c4}', <File size={15} weight="bold" />, 'Document', ''],
                ['\u{1f4d6}', <BookOpen size={15} weight="bold" />, 'Docs, reading', ''],
                ['', <Notebook size={15} weight="bold" />, 'Notebook', 'a document'],
                ['\u{1f4ca}', <ChartBar size={15} weight="bold" />, 'Metrics, chart', ''],
                ['\u{1f9e0}', <Brain size={15} weight="bold" />, 'Knowledge, memory', ''],
                ['\u{1f52c}', <Microscope size={15} weight="bold" />, 'Research', ''],
                ['\u{1f9ec}', <Dna size={15} weight="bold" />, 'Genome', ''],
                ['\u{1f9ea}', <Flask size={15} weight="bold" />, 'Experiment', ''],
                [
                  '\u232c',
                  <Hexagon size={15} weight="bold" />,
                  'Molecule, structure',
                  'a single atom — Atom',
                ],
                ['\u{1f50c}', <Plug size={15} weight="bold" />, 'Tools, plug-in', ''],
                ['\u{1f9e9}', <PuzzlePiece size={15} weight="bold" />, 'App, extension', ''],
              ] as const
            ).map(([, icon, means, not_], i) => (
              <Tr key={i}>
                <Td style={{ color: 'var(--c-ink3)' }}>{icon}</Td>
                <Td>{means}</Td>
                <Td className="note">{not_}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Frame>
      <div className={s.sub}>Categories</div>
      <p className={s.note}>
        When colour identifies a kind rather than a state, give each kind its own icon and keep the
        pairs in one map, so a new kind cannot arrive without one. Two kinds may share a hue if
        their icons differ; two kinds may not share an icon. Check any set with the deuteranopia
        filter at the top of this page &mdash; if a distinction disappears, it was never encoded.
      </p>

      <div className={s.sub}>Science</div>
      <p className={s.note}>Phosphor includes science-relevant icons out of the box.</p>
      <div
        style={{
          display: 'flex',
          gap: 'var(--s-6)',
          flexWrap: 'wrap',
          color: 'var(--c-ink3)',
          fontSize: 'var(--fs-5)',
        }}
      >
        {[
          [Flask, 'Flask'],
          [Dna, 'DNA'],
          [TreeStructure, 'Tree'],
          [Atom, 'Atom'],
          [Bug, 'Microbe'],
          [Leaf, 'Leaf'],
          [ChartBar, 'Chart'],
          [TableIcon, 'Table'],
        ].map(([Icon, label]) => (
          <span
            key={label as string}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)' }}
          >
            <Icon size={16} /> {label as string}
          </span>
        ))}
      </div>
    </div>
  );
}
