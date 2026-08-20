import { useState, type ReactNode } from 'react';
import s from './showcase.module.scss';
import { Frame } from '../components/Frame';
import * as Tree from '../components/Tree';
import * as Stepper from '../components/Stepper';
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
      {
        id: 'src/tokens',
        label: 'tokens',
        icon: <Folder size={13} />,
        children: [
          { id: 'src/tokens/tokens.css', label: 'tokens.css', icon: <FileText size={13} /> },
          { id: 'src/tokens/fonts.css', label: 'fonts.css', icon: <FileText size={13} /> },
        ],
      },
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

export function Section12Navigation() {
  const [treeSelected, setTreeSelected] = useState<string | undefined>('src/components/Tree.tsx');

  return (
    <div className={s.section}>
      <div className={s.sNum}>12</div>
      <div className={s.sTitle}>Navigation</div>
      <p className={s.sDesc}>
        Tree for hierarchical browsing. Stepper for multi-step flows. Both use keyboard navigation.
      </p>

      <div className={s.sub}>Tree</div>
      <div style={{ display: 'flex', gap: 'var(--s-9)', flexWrap: 'wrap' }}>
        <Frame padding={4} style={{ width: 260 }}>
          <Tree.Root
            items={treeItems}
            selected={treeSelected}
            onSelect={setTreeSelected}
            defaultExpanded={['src', 'src/components']}
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
            Arrow keys navigate. Right expands, Left collapses. Left-border indent follows KBase
            nesting norm.
          </div>
        </div>
      </div>

      <div className={s.sub} style={{ marginTop: 'var(--s-9)' }}>
        Stepper, Horizontal
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
        Stepper, Vertical
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
