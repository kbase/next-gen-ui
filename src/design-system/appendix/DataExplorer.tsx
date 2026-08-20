import { useState, useMemo } from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { Pagination } from '../components/Pagination';
import { Checkbox } from '../components/Checkbox';
import { TypeBadge } from '../components/TypeBadge';
import { Chip } from '../components/Chip';
import * as Accordion from '../components/Accordion';
import { Button } from '../components/Button';
import { Frame } from '../components/Frame';
import { SearchBar } from '../components/SearchBar';
import { SegmentedControl } from '../components/SegmentedControl';
import { EmptyState } from '../components/EmptyState';
import s from './appendix-shared.module.scss';
import {
  CheckCircle,
  Clock,
  XCircle,
  Table as TableIcon,
  SquaresFour,
  List,
  MagnifyingGlass,
} from '@phosphor-icons/react';

interface GenomeRow {
  id: string;
  name: string;
  type: string;
  badge: 'primary' | 'teal' | 'ocean' | 'green' | 'orange' | 'purple';
  abbr: string;
  organism: string;
  size: string;
  status: 'complete' | 'running' | 'error';
}

const DATA: GenomeRow[] = [
  {
    id: '1',
    name: 'Escherichia coli K-12 MG1655',
    type: 'Genome',
    badge: 'primary',
    abbr: 'Gn',
    organism: 'E. coli',
    size: '4.6 Mb',
    status: 'complete',
  },
  {
    id: '2',
    name: 'Soil sample contigs v2',
    type: 'Assembly',
    badge: 'teal',
    abbr: 'As',
    organism: 'Metagenome',
    size: '48.2 Mb',
    status: 'complete',
  },
  {
    id: '3',
    name: 'Core metabolism FBA model',
    type: 'FBAModel',
    badge: 'ocean',
    abbr: 'Md',
    organism: 'E. coli',
    size: '1.2 Mb',
    status: 'complete',
  },
  {
    id: '4',
    name: 'Rhizosphere pangenome',
    type: 'Pangenome',
    badge: 'green',
    abbr: 'Pn',
    organism: 'Rhizosphere',
    size: '892 Kb',
    status: 'running',
  },
  {
    id: '5',
    name: 'Marine sediment MAGs',
    type: 'Assembly',
    badge: 'teal',
    abbr: 'As',
    organism: 'Metagenome',
    size: '124 Mb',
    status: 'error',
  },
  {
    id: '6',
    name: 'Arabidopsis thaliana TAIR10',
    type: 'Genome',
    badge: 'primary',
    abbr: 'Gn',
    organism: 'A. thaliana',
    size: '119 Mb',
    status: 'complete',
  },
  {
    id: '7',
    name: 'Gut microbiome reads',
    type: 'Reads',
    badge: 'orange',
    abbr: 'Rd',
    organism: 'Human gut',
    size: '2.1 Gb',
    status: 'complete',
  },
  {
    id: '8',
    name: 'Poplar genome annotation',
    type: 'Genome',
    badge: 'primary',
    abbr: 'Gn',
    organism: 'P. trichocarpa',
    size: '423 Mb',
    status: 'running',
  },
];

const STATUS_MAP = {
  complete: {
    color: 'green' as const,
    icon: <CheckCircle size={10} weight="bold" />,
    label: 'Complete',
  },
  running: { color: 'primary' as const, icon: <Clock size={10} weight="bold" />, label: 'Running' },
  error: { color: 'red' as const, icon: <XCircle size={10} weight="bold" />, label: 'Error' },
};

const FACETS = [
  {
    key: 'type',
    label: 'Data type',
    options: [
      { label: 'Genome', value: 'Genome', count: 3 },
      { label: 'Assembly', value: 'Assembly', count: 2 },
      { label: 'FBAModel', value: 'FBAModel', count: 1 },
      { label: 'Pangenome', value: 'Pangenome', count: 1 },
      { label: 'Reads', value: 'Reads', count: 1 },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { label: 'Complete', value: 'complete', count: 5 },
      { label: 'Running', value: 'running', count: 2 },
      { label: 'Error', value: 'error', count: 1 },
    ],
  },
];

type SortKey = 'name' | 'type' | 'organism' | 'size';
type SortDir = 'asc' | 'desc';

export function DataExplorerAppendix() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('table');
  const pageSize = 5;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const toggleFilter = (groupKey: string, value: string) => {
    setFilters((prev) => {
      const vals = prev[groupKey] ?? [];
      return {
        ...prev,
        [groupKey]: vals.includes(value) ? vals.filter((v) => v !== value) : [...vals, value],
      };
    });
    setPage(1);
  };

  const activeFilterChips = Object.entries(filters).flatMap(([gk, vals]) =>
    vals.map((v) => ({
      groupKey: gk,
      value: v,
      label: FACETS.find((f) => f.key === gk)?.options.find((o) => o.value === v)?.label ?? v,
    })),
  );

  const filtered = useMemo(() => {
    let d = DATA;
    if (search) d = d.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    for (const [key, vals] of Object.entries(filters)) {
      if (vals.length === 0) continue;
      d = d.filter((r) => vals.includes(String((r as unknown as Record<string, unknown>)[key])));
    }
    if (sortKey) {
      d = [...d].sort((a, b) => {
        const cmp = String((a as unknown as Record<string, unknown>)[sortKey]).localeCompare(
          String((b as unknown as Record<string, unknown>)[sortKey]),
          undefined,
          { numeric: true },
        );
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return d;
  }, [search, filters, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allPageKeys = new Set(paged.map((r) => r.id));
  const allSelected = paged.length > 0 && [...allPageKeys].every((k) => selected.has(k));
  const someSelected = [...allPageKeys].some((k) => selected.has(k)) && !allSelected;

  const toggleRow = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    const n = new Set(selected);
    if (allSelected) allPageKeys.forEach((k) => n.delete(k));
    else allPageKeys.forEach((k) => n.add(k));
    setSelected(n);
  };
  const sort = (key: SortKey) => (sortKey === key ? sortDir : undefined);

  return (
    <div className={s.root}>
      <div className={s.num}>A</div>
      <div className={s.title}>Data explorer pattern</div>
      <p className={s.desc}>
        Not a component. It's a composition recipe: apps arrange design system primitives for
        faceted search, sortable tables, and filtered views.
      </p>
      <p className={s.note}>
        Narrow screens: facet panel stacks above the table. Accordion groups collapse by default.
        Dismissable chips summarize active filters inline.
      </p>

      <div className={s.layout}>
        <div className={s.sidebar}>
          <Accordion.Root defaultValue={FACETS.map((group) => group.key)}>
            {FACETS.map((group) => (
              <Accordion.Item key={group.key} value={group.key} title={group.label}>
                <div className={s.facetOptions}>
                  {group.options.map((opt) => (
                    <label key={opt.value} className={s.facetOption}>
                      <Checkbox
                        checked={(filters[group.key] ?? []).includes(opt.value)}
                        onCheckedChange={() => toggleFilter(group.key, opt.value)}
                      />
                      <span className={s.facetLabel}>{opt.label}</span>
                      <span className={s.facetCount}>{opt.count}</span>
                    </label>
                  ))}
                </div>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>

        <div className={s.main}>
          {activeFilterChips.length > 0 && (
            <div className={s.activeFilters}>
              {activeFilterChips.map((f) => (
                <Chip
                  key={`${f.groupKey}:${f.value}`}
                  color="primary"
                  onDismiss={() => toggleFilter(f.groupKey, f.value)}
                >
                  {f.label}
                </Chip>
              ))}
            </div>
          )}

          <div className={s.toolbar}>
            <SearchBar value={search} onValueChange={setSearch} placeholder="Search objects..." />
            <span className={s.resultCount}>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of{' '}
              {filtered.length}
            </span>
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: 'table', icon: <TableIcon size={14} />, label: 'Table' },
                { value: 'grid', icon: <SquaresFour size={14} />, label: 'Grid' },
                { value: 'list', icon: <List size={14} />, label: 'List' },
              ]}
            />
          </div>

          {filtered.length === 0 ? (
            <Frame padding={0}>
              <EmptyState
                icon={<MagnifyingGlass size={32} />}
                title="No objects match"
                description="Try adjusting your search or filters."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setFilters({});
                    }}
                  >
                    Clear all filters
                  </Button>
                }
              />
            </Frame>
          ) : (
            <>
              <Table>
                <Thead>
                  <Tr>
                    <Th style={{ width: 32, paddingRight: 0 }}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onCheckedChange={toggleAll}
                      />
                    </Th>
                    <Th sort={sort('name')} onClick={() => toggleSort('name')}>
                      Object
                    </Th>
                    <Th
                      sort={sort('type')}
                      onClick={() => toggleSort('type')}
                      style={{ width: 70 }}
                    >
                      Type
                    </Th>
                    <Th sort={sort('organism')} onClick={() => toggleSort('organism')}>
                      Organism
                    </Th>
                    <Th
                      sort={sort('size')}
                      onClick={() => toggleSort('size')}
                      style={{ width: 70 }}
                    >
                      Size
                    </Th>
                    <Th style={{ width: 90 }}>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paged.map((row) => {
                    const st = STATUS_MAP[row.status];
                    return (
                      <Tr key={row.id}>
                        <Td style={{ paddingRight: 0 }}>
                          <Checkbox
                            checked={selected.has(row.id)}
                            onCheckedChange={() => toggleRow(row.id)}
                          />
                        </Td>
                        <Td>{row.name}</Td>
                        <Td>
                          <TypeBadge color={row.badge}>{row.abbr}</TypeBadge>
                        </Td>
                        <Td>{row.organism}</Td>
                        <Td>
                          <span className={s.mono}>{row.size}</span>
                        </Td>
                        <Td>
                          <Chip color={st.color}>
                            {st.icon} {st.label}
                          </Chip>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
              {totalPages > 1 && (
                <div className={s.paginationWrap}>
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
