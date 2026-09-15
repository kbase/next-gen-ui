import { Tree } from '@kbase/design-system';
import { definePane, fromReact, useHost, usePanelTitle } from '@kbase/plugin-sdk';
import { dataset, datasets } from './data';

function DataHome() {
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
        if (id.startsWith('ref:')) host.openRoute(`/${id.slice(4)}`);
      }}
    />
  );
}

export default definePane(fromReact(DataHome));
