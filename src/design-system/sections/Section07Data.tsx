import s from './showcase.module.scss';
import { Chip } from '../components/Chip';
import { TypeBadge } from '../components/TypeBadge';
import { Skeleton } from '../components/Skeleton';
import { Badge } from '../components/Badge';
import { NavIcon } from '../components/NavIcon';
import { Frame } from '../components/Frame';
import { CodeBlock } from '../components/CodeBlock';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { Pagination } from '../components/Pagination';
import { VizContainer } from '../components/VizContainer';
import { ArrowsCounterClockwise, Bell, Warning, ChartBar } from '@phosphor-icons/react';

export function Section07Data() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>07</div>
      <div className={s.sTitle}>Data</div>
      <p className={s.sDesc}>
        Every KBase type gets a two-letter abbreviation and a color. The abbreviation is the
        identifier, color is reinforcement. Never rely on color alone.
      </p>

      <div className={s.sub}>Data-type marker (TypeBadge preset)</div>
      <p className={s.note}>
        A 28px square Avatar in <code>tint</code> variant, not a separate primitive. Use inside
        tables, data panels, and object lists. Pass a one or two character abbreviation (or a small
        icon) as children.
      </p>
      <div className={s.row}>
        <TypeBadge color="red">Gn</TypeBadge>
        <TypeBadge color="primary">As</TypeBadge>
        <TypeBadge color="ocean">Md</TypeBadge>
        <TypeBadge color="teal">Tx</TypeBadge>
        <TypeBadge color="purple">Pn</TypeBadge>
        <TypeBadge color="orange">Rd</TypeBadge>
      </div>
      <CodeBlock
        language="tsx"
        code={`<TypeBadge color="red">Gn</TypeBadge>     // Genome
<TypeBadge color="primary">As</TypeBadge> // Assembly
<TypeBadge color="ocean">Md</TypeBadge>   // Model

// Equivalent. TypeBadge is just an Avatar preset:
<Avatar shape="square" variant="tint" size={28} color="red">Gn</Avatar>`}
      />

      <div className={s.sub}>Table</div>
      <p className={s.note}>
        Styled rows. The table is stateless: sorting, filtering, and pagination are app concerns.
        Use <code>Chip onWhite</code> for type tags inside white table rows.
      </p>
      <Table>
        <Thead>
          <Tr>
            <Th>Object</Th>
            <Th>Type</Th>
            <Th style={{ textAlign: 'right' }}>Size</Th>
            <Th style={{ textAlign: 'right' }}>obj/ver</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td style={{ fontWeight: 600 }}>Escherichia coli K-12 MG1655</Td>
            <Td>
              <Chip color="red" onWhite>
                Gn
              </Chip>
            </Td>
            <Td className="mono-secondary" style={{ textAlign: 'right' }}>
              4.6 Mb
            </Td>
            <Td className="mono-secondary" style={{ textAlign: 'right' }}>
              3/1
            </Td>
          </Tr>
          <Tr>
            <Td style={{ fontWeight: 600 }}>Soil sample contigs v2</Td>
            <Td>
              <Chip color="primary" onWhite>
                As
              </Chip>
            </Td>
            <Td className="mono-secondary" style={{ textAlign: 'right' }}>
              48.2 Mb
            </Td>
            <Td className="mono-secondary" style={{ textAlign: 'right' }}>
              7/2
            </Td>
          </Tr>
        </Tbody>
      </Table>
      <div style={{ marginTop: 'var(--s-6)' }}>
        <Pagination page={3} totalPages={12} onPageChange={() => {}} />
      </div>
      <CodeBlock
        language="tsx"
        code={`<Table>
  <Thead><Tr><Th>Object</Th><Th>Type</Th></Tr></Thead>
  <Tbody>
    <Tr>
      <Td>E. coli K-12</Td>
      <Td><Chip color="red" onWhite>Gn</Chip></Td>
    </Tr>
  </Tbody>
</Table>
<Pagination page={page} totalPages={total} onPageChange={setPage} />`}
      />

      <div className={s.sub}>Compact density</div>
      <p className={s.note}>
        Pass <code>compact</code> for a flat-on-flat treatment with smaller type and tighter
        padding. Use inside cards or panels where the standard table's frame would compete with the
        surrounding container.
      </p>
      <Frame paddingY={6}>
        <Table compact>
          <Thead>
            <Tr>
              <Th>Stage</Th>
              <Th style={{ textAlign: 'right' }}>Reads</Th>
              <Th style={{ textAlign: 'right' }}>Pass %</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>Raw</Td>
              <Td className="mono-secondary" style={{ textAlign: 'right' }}>
                2.4M
              </Td>
              <Td className="mono-secondary" style={{ textAlign: 'right' }}>
                n/a
              </Td>
            </Tr>
            <Tr>
              <Td>Trimmed</Td>
              <Td className="mono-secondary" style={{ textAlign: 'right' }}>
                2.1M
              </Td>
              <Td className="mono-secondary" style={{ textAlign: 'right' }}>
                87.5
              </Td>
            </Tr>
            <Tr>
              <Td>Aligned</Td>
              <Td className="mono-secondary" style={{ textAlign: 'right' }}>
                1.9M
              </Td>
              <Td className="mono-secondary" style={{ textAlign: 'right' }}>
                90.4
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Table compact>...</Table>  // flat, no border/radius, for tables inside cards`}
      />

      <div className={s.sub}>Sortable headers</div>
      <p className={s.note}>
        Add <code>sort</code> and <code>onClick</code> to Th. Sort indicator appears on hover (idle)
        or always (active).
      </p>
      <Table>
        <Thead>
          <Tr>
            <Th sort="asc" onClick={() => {}}>
              Name (asc)
            </Th>
            <Th sort="desc" onClick={() => {}}>
              Size (desc)
            </Th>
            <Th onClick={() => {}}>Type (idle)</Th>
            <Th>Status (not sortable)</Th>
          </Tr>
        </Thead>
      </Table>
      <CodeBlock
        language="tsx"
        code={`<Th sort={sortDir} onClick={() => toggleSort('name')}>Name</Th>
<Th onClick={() => toggleSort('type')}>Type</Th>  // idle, no sort prop
<Th>Status</Th>                                    // no onClick = not sortable`}
      />

      <div className={s.sub}>Dismissable chips</div>
      <p className={s.note}>
        Add <code>onDismiss</code> to Chip for active filter tags.
      </p>
      <div className={s.row}>
        <Chip color="primary" onDismiss={() => {}}>
          Genome
        </Chip>
        <Chip color="teal" onDismiss={() => {}}>
          Assembly
        </Chip>
        <Chip color="red" onDismiss={() => {}}>
          Error
        </Chip>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Chip color="primary" onDismiss={() => removeFilter('type', 'Genome')}>Genome</Chip>`}
      />

      <div className={s.sub}>Skeleton table</div>
      <p className={s.note}>Skeleton inside table cells for loading state.</p>
      <Table>
        <Thead>
          <Tr>
            <Th>Object</Th>
            <Th>Type</Th>
            <Th>Size</Th>
          </Tr>
        </Thead>
        <Tbody>
          {[1, 2, 3].map((i) => (
            <Tr key={i}>
              <Td>
                <Skeleton width="70%" />
              </Td>
              <Td>
                <Skeleton width={32} height={18} />
              </Td>
              <Td>
                <Skeleton width="40%" />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <CodeBlock
        language="tsx"
        code={`// Match column widths to real content proportions
<Tr>
  <Td><Skeleton width="70%" /></Td>
  <Td><Skeleton width={32} height={18} /></Td>
  <Td><Skeleton width="40%" /></Td>
</Tr>`}
      />

      <div className={s.sub}>Badge</div>
      <p className={s.note}>
        Overlays a count on any element. Three colors: primary, red, green. No dot-only variant; a
        number is always more useful.
      </p>
      <div className={s.row}>
        <Badge count={3}>
          <NavIcon aria-label="Notifications">
            <Bell size={18} />
          </NavIcon>
        </Badge>
        <Badge count={42} color="red">
          <NavIcon aria-label="Errors">
            <Warning size={18} />
          </NavIcon>
        </Badge>
        <Badge count={1} color="green">
          <NavIcon aria-label="Updates">
            <ArrowsCounterClockwise size={18} />
          </NavIcon>
        </Badge>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Badge count={3}><NavIcon aria-label="Notifications"><Bell size={18} /></NavIcon></Badge>
<Badge count={42} color="red">...</Badge>`}
      />

      <div className={s.sub}>VizContainer</div>
      <p className={s.note}>
        Frame with title bar, toolbar slot, legend slot, and export button. ResizeObserver measures
        the canvas and passes{' '}
        <code>
          {'{'}width, height{'}'}
        </code>{' '}
        to children via render prop. Use this to size SVG/canvas responsively. Plain ReactNode
        children also work when you don't need measured dimensions.
      </p>
      <p className={s.note}>
        <code>loading</code> shows Skeleton + Loader. <code>error</code> + <code>onRetry</code>{' '}
        shows an Alert following §06 error patterns. <code>aspectRatio</code> constrains
        proportions. <code>onExport</code> adds a download button; the handler is yours.
      </p>
      <p className={s.note}>
        <code>canvasRef</code> exposes the canvas div for D3 or direct DOM work:
      </p>
      <CodeBlock
        language="tsx"
        code={`const ref = useRef<HTMLDivElement>(null);

<VizContainer title="Heatmap" canvasRef={ref}>
  <MyD3Chart container={ref} />
</VizContainer>`}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <VizContainer
          title="GC content by organism"
          toolbar={
            <Chip color="primary" onWhite>
              <ChartBar size={9} weight="bold" /> Bar chart
            </Chip>
          }
          legend={
            <div style={{ display: 'flex', gap: 'var(--s-7)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--c-primary)',
                  }}
                />
                <span>Sample A</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--c-teal)',
                  }}
                />
                <span>Sample B</span>
              </span>
            </div>
          }
          onExport={() => {}}
          aspectRatio={3}
        >
          {({ width, height }) => {
            const data = [51, 44, 67, 33, 66];
            const data2 = [48, 42, 63, 35, 61];
            const barW = (width - 48) / data.length / 2 - 1;
            const maxH = height - 24;
            return (
              <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                {data.map((d, i) => {
                  const x = 24 + i * ((width - 48) / data.length);
                  return (
                    <g key={i}>
                      <rect
                        x={x}
                        y={height - 8 - (d / 100) * maxH}
                        width={barW}
                        height={(d / 100) * maxH}
                        rx={2}
                        fill="var(--c-primary)"
                        opacity={0.75}
                      />
                      <rect
                        x={x + barW + 1}
                        y={height - 8 - (data2[i] / 100) * maxH}
                        width={barW}
                        height={(data2[i] / 100) * maxH}
                        rx={2}
                        fill="var(--c-teal)"
                        opacity={0.75}
                      />
                    </g>
                  );
                })}
              </svg>
            );
          }}
        </VizContainer>
        <VizContainer title="GC content heatmap" loading />
        <VizContainer title="Alignment viewer" error="WebGL context lost." onRetry={() => {}} />
      </div>
      <CodeBlock
        language="tsx"
        code={`// Render prop: children receive measured { width, height }
<VizContainer title="Chart" onExport={handleExport} aspectRatio={16/9}>
  {({ width, height }) => (
    <svg width={width} height={height}>...</svg>
  )}
</VizContainer>

// Loading and error states
<VizContainer title="Heatmap" loading />
<VizContainer title="Viewer" error="WebGL lost." onRetry={reload} />`}
      />
    </div>
  );
}
