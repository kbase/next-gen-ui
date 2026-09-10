import { useState, type ReactNode } from 'react';
import s from './showcase.module.scss';
import { Frame } from '../components/Frame';
import * as Tabs from '../components/Tabs';
import * as Tree from '../components/Tree';
import * as Stepper from '../components/Stepper';
import { SearchBar } from '../components/SearchBar';
import { CodeBlock } from '../components/CodeBlock';
import css from './Section12Navigation.module.scss';
import { Folder, FileText, FileCode, Eye, DotsThree } from '@phosphor-icons/react';

const treeBtn = (icon: ReactNode) => <button onClick={(e) => e.stopPropagation()}>{icon}</button>;

const treeItems: Tree.TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    icon: <Folder size={13} />,
    children: [
      {
        id: 'src/components',
        label: 'components',
        icon: <Folder size={13} />,
        children: [
          {
            id: 'src/components/Button.tsx',
            label: 'Button.tsx',
            icon: <FileCode size={13} />,
            actions: (
              <>
                {treeBtn(<Eye size={12} />)}
                {treeBtn(<DotsThree size={12} />)}
              </>
            ),
          },
          {
            id: 'src/components/Input.tsx',
            label: 'Input.tsx',
            icon: <FileCode size={13} />,
            actions: (
              <>
                {treeBtn(<Eye size={12} />)}
                {treeBtn(<DotsThree size={12} />)}
              </>
            ),
          },
          {
            id: 'src/components/Tree.tsx',
            label: 'Tree.tsx',
            icon: <FileCode size={13} />,
            actions: (
              <>
                {treeBtn(<Eye size={12} />)}
                {treeBtn(<DotsThree size={12} />)}
              </>
            ),
          },
        ],
      },
      { id: 'src/tokens.css', label: 'tokens.css', icon: <FileText size={13} /> },
      { id: 'src/fonts.css', label: 'fonts.css', icon: <FileText size={13} /> },
      { id: 'src/utilities.css', label: 'utilities.css', icon: <FileText size={13} /> },
      { id: 'src/main.tsx', label: 'main.tsx', icon: <FileCode size={13} /> },
      { id: 'src/Showcase.tsx', label: 'Showcase.tsx', icon: <FileCode size={13} /> },
    ],
  },
  {
    id: 'scripts',
    label: 'scripts',
    icon: <Folder size={13} />,
    children: [
      { id: 'scripts/build.py', label: 'build.py', icon: <FileText size={13} /> },
      { id: 'scripts/deploy.sh', label: 'deploy.sh', icon: <FileText size={13} /> },
    ],
  },
  { id: 'package.json', label: 'package.json', icon: <FileText size={13} /> },
  { id: 'README.md', label: 'README.md', icon: <FileText size={13} /> },
];

function branchesMatching(nodes: Tree.TreeNode[], query: string): string[] {
  // Trimmed, or a lone space matches every label containing one.
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const found: string[] = [];
  const walk = (node: Tree.TreeNode): boolean => {
    const childMatched = (node.children ?? []).map(walk).some(Boolean);
    if (childMatched) found.push(node.id);
    return childMatched || node.label.toLowerCase().includes(needle);
  };
  nodes.forEach(walk);
  return found;
}

export function Section12Navigation() {
  const [treeSelected, setTreeSelected] = useState<string | undefined>('src/components/Tree.tsx');
  const [filter, setFilter] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>(['src']);
  // Its own selection, so the two demos do not move each other's highlight.
  const [filteredSelected, setFilteredSelected] = useState<string | undefined>();

  function handleFilter(query: string) {
    setFilter(query);
    setExpandedIds((prev) => [...new Set([...prev, ...branchesMatching(treeItems, query)])]);
  }

  return (
    <div className={s.section}>
      <div className={s.sNum}>12</div>
      <div className={s.sTitle}>Navigation</div>
      <p className={s.sDesc}>
        Tree for hierarchical browsing. Tabs for switching views. Stepper for multi-step flows. All
        use keyboard navigation.
      </p>

      <div className={s.sub}>Tree</div>
      <div style={{ display: 'flex', gap: 'var(--s-9)', flexWrap: 'wrap' }}>
        <Frame padding={4} style={{ width: 260 }}>
          <Tree.Root
            items={treeItems}
            selected={treeSelected}
            onSelect={setTreeSelected}
            defaultExpanded={['src', 'src/components']}
            aria-label="Project files"
          />
        </Frame>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="mono-secondary" style={{ marginBottom: 'var(--s-2)' }}>
            Selected
          </div>
          <div
            style={{
              fontSize: 'var(--fs-6)',
              color: 'var(--c-ink2)',
              fontFamily: 'var(--f-mono)',
            }}
          >
            {treeSelected || 'none'}
          </div>
          <div className="note" style={{ marginTop: 'var(--s-6)' }}>
            Arrow keys navigate. Right expands, Left collapses. Each level is indented with a left
            border.
          </div>
        </div>
      </div>

      <div className={s.sub} style={{ marginTop: 'var(--s-9)' }}>
        Tree, controlled expansion
      </div>
      <p className={s.note}>
        Pass <code>expanded</code> and <code>onExpandedChange</code> to decide what is open. Here a
        search opens every branch containing a match. Because expansion is state rather than derived
        from the query, a branch the search opened can still be collapsed by hand.
      </p>
      <div className={css.treePanel}>
        <SearchBar
          value={filter}
          onValueChange={handleFilter}
          placeholder="Search files..."
          aria-label="Search files"
        />
        <Frame padding={4}>
          <Tree.Root
            items={treeItems}
            selected={filteredSelected}
            onSelect={setFilteredSelected}
            expanded={expandedIds}
            onExpandedChange={setExpandedIds}
            aria-label="Filtered project files"
          />
        </Frame>
        <div className={css.treeState}>
          <span className="mono-secondary">Expanded</span> {expandedIds.join(', ') || 'none'}
        </div>
      </div>
      <CodeBlock
        language="tsx"
        code={`const [expanded, setExpanded] = useState(['src']);

function handleFilter(query: string) {
  setFilter(query);
  // Open the branches containing a match, without closing anything.
  setExpanded((prev) => [...new Set([...prev, ...branchesMatching(items, query)])]);
}

<Tree.Root items={items} expanded={expanded} onExpandedChange={setExpanded} />`}
      />

      <div className={s.sub} style={{ marginTop: 'var(--s-9)' }}>
        Tabs
      </div>
      <p className={s.note}>
        One tab treatment everywhere: the selected tab is underlined in primary. Content tabs use
        the component; strips it cannot host (closeable, draggable window tabs like the
        workbench&apos;s) apply <code>Tabs.tabClasses</code> to their own markup so they render
        identically.
      </p>
      <div style={{ maxWidth: 420 }}>
        <Tabs.Root defaultValue="mine">
          <Tabs.List>
            <Tabs.Tab value="mine">Mine</Tabs.Tab>
            <Tabs.Tab value="shared">Shared</Tabs.Tab>
            <Tabs.Tab value="public">Public</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="mine">
            <span className="body">Narratives you own.</span>
          </Tabs.Panel>
          <Tabs.Panel value="shared">
            <span className="body">Narratives shared with you.</span>
          </Tabs.Panel>
          <Tabs.Panel value="public">
            <span className="body">Public narratives.</span>
          </Tabs.Panel>
        </Tabs.Root>
      </div>

      <div className={s.sub} style={{ marginTop: 'var(--s-9)' }}>
        Stepper, horizontal
      </div>
      <Stepper.Root
        steps={[
          { label: 'Select data', description: 'Choose input files' },
          { label: 'Configure', description: 'Set parameters' },
          { label: 'Review', description: 'Verify settings' },
          { label: 'Submit', description: 'Launch analysis' },
        ]}
        activeStep={2}
        orientation="horizontal"
      />

      <div className={s.sub} style={{ marginTop: 'var(--s-9)' }}>
        Stepper, vertical
      </div>
      <Stepper.Root
        steps={[
          { label: 'Upload files', description: 'FASTQ, GFF, FASTA' },
          { label: 'Validate format', description: 'Check file integrity' },
          { label: 'Import to workspace', description: 'Create data objects' },
          { label: 'Run annotation' },
        ]}
        activeStep={1}
        orientation="vertical"
      />
    </div>
  );
}
