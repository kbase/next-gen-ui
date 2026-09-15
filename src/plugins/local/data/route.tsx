import { Chip, Table, Tbody, Td, Th, Thead, Tr } from '@kbase/design-system';
import { defineRoute, fromReact, usePanel, usePanelTitle } from '@kbase/plugin-sdk';
import { dataset, refOf } from './data';

function DatasetPage() {
  const { path } = usePanel();
  const ref = refOf(path);
  const d = dataset(ref);
  usePanelTitle(d ? d.name : ref);
  if (!d) {
    return (
      <div style={{ padding: 'var(--s-5)' }}>
        <p className="body">No dataset has the ref “{ref}”.</p>
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

export default defineRoute({ ...fromReact(DatasetPage), normalize: refOf });
