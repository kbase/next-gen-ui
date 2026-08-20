import s from './showcase.module.scss';
import { Chip } from '../components/Chip';
import { Frame } from '../components/Frame';
import { CodeBlock } from '../components/CodeBlock';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import {
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

// Status chips: bold at size 9
<Chip color="green"><CheckCircle size={9} weight="bold" /> Complete</Chip>

// Button icons: bold at size 14
<Button variant="primary"><Play size={14} weight="bold" /> Run</Button>`}
      />

      <div className={s.sub}>Status chips</div>
      <p className={s.note}>
        Each status has a unique icon shape. Bold weight at size 9 inside Chip.
      </p>
      <div className={s.row}>
        <Chip color="primary">
          <Play size={9} weight="bold" /> Running
        </Chip>
        <Chip color="green">
          <CheckCircle size={9} weight="bold" /> Complete
        </Chip>
        <Chip color="red">
          <X size={9} weight="bold" /> Error
        </Chip>
        <Chip color="yellow">
          <Warning size={9} weight="bold" /> Warning
        </Chip>
        <Chip color="primary">
          <Clock size={9} weight="bold" /> Queued
        </Chip>
      </div>

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
