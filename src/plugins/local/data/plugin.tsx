import { Chip, Table, Tbody, Td, Th, Thead, Tr, Tree } from '@kbase/design-system';
import { definePlugin, useHost, usePanel, usePanelTitle } from '@kbase/plugin-sdk';
import { dataset, datasets } from './data';

function DataHomeNavigator() {
  usePanelTitle('Data home');
  const host = useHost();
  const byNarrative = new Map<string, typeof datasets>();
  for (const d of datasets) {
    if (d.source !== 'kbase-1.0') continue;
    byNarrative.set(d.narrative!, [...(byNarrative.get(d.narrative!) ?? []), d]);
  }
  const leaf = (d: (typeof datasets)[number]) => ({
    id: `ref:${d.ref}`,
    label: d.name,
    suffix: <span className="caption">{d.type}</span>,
  });
  const items = [
    {
      id: 'arcs',
      label: 'Produced in arcs',
      children: datasets.filter((d) => d.source === 'arc').map(leaf),
    },
    {
      id: 'uploads',
      label: 'Uploads',
      children: datasets.filter((d) => d.source === 'upload' && d.ref !== 'crash-test').map(leaf),
    },
    {
      id: 'kbase-1',
      label: 'KBase 1.0',
      children: [...byNarrative.entries()].map(([narrative, list]) => ({
        id: `narrative:${narrative}`,
        label: narrative,
        children: list.map(leaf),
      })),
    },
    { id: 'fixtures', label: 'Fixtures', children: [leaf(dataset('crash-test')!)] },
  ];
  return (
    <Tree.Root
      aria-label="Data home"
      items={items}
      defaultExpanded={['arcs', 'uploads', 'kbase-1', 'fixtures']}
      onSelect={(id) => {
        if (id.startsWith('ref:')) host.openDocument({ ref: id.slice(4) });
      }}
    />
  );
}

function DatasetDocument() {
  const { params } = usePanel();
  const d = dataset(params.ref);
  usePanelTitle(d ? d.name : params.ref);
  if (!d) {
    return (
      <div style={{ padding: 'var(--s-5)' }}>
        <p className="body">No dataset has the ref “{params.ref}”.</p>
      </div>
    );
  }
  if (d.ref === 'crash-test') throw new Error('the crash-test fixture threw on purpose');
  return (
    <div style={{ padding: 'var(--s-5)', display: 'grid', gap: 'var(--s-5)' }}>
      <div>
        <h1 className="h2">{d.name}</h1>
        <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
          <Chip color="neutral" label={d.type} />
          {d.source === 'kbase-1.0' && <Chip color="ocean" label={`KBase 1.0 · ${d.ref}`} />}
          {d.producedBy && <Chip color="purple" label={`from arc ${d.producedBy}`} />}
        </div>
      </div>
      <Table>
        <Thead>
          <Tr>
            <Th>Provenance</Th>
            <Th>Value</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>Source</Td>
            <Td>{d.source}</Td>
          </Tr>
          <Tr>
            <Td>Size</Td>
            <Td>{d.size}</Td>
          </Tr>
          {d.narrative && (
            <Tr>
              <Td>Narrative</Td>
              <Td>{d.narrative}</Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </div>
  );
}

export default definePlugin({ navigator: DataHomeNavigator, document: DatasetDocument });
