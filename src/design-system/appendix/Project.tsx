import { useState } from 'react';
import { CodeBlock } from '../components/CodeBlock';
import { JobPanel } from './JobPanel';
import { Button } from '../components/Button';
import { Code, Database, TextAa, Play } from '@phosphor-icons/react';
import s from './appendix-shared.module.scss';

export function ProjectAppendix() {
  const [selected, setSelected] = useState<string | null>('code');

  return (
    <div className={s.root}>
      <div className={s.num}>F</div>
      <div className={s.title}>Project cell pattern</div>
      <p className={s.desc}>
        Cells are inline document blocks, not cards. Left border indicates type and selection. App
        cells embed JobPanel. Code cells provide an editor slot.
      </p>
      <p className={s.note}>
        The editor itself is app-level, Monaco or CodeMirror. The design system provides the chrome
        around it; CodeBlock stands in for the editor here.
      </p>

      <div style={{ marginTop: 'var(--s-7)' }}>
        <div style={{ marginBottom: 'var(--s-9)' }}>
          <h1 className="h1">Soil Metagenome Analysis</h1>
          <span className="caption">
            Last saved 2 hours ago · <span className="mono">jdoe</span> ·{' '}
            <span className="mono">ws:45221</span>
          </span>
        </div>

        <div
          onClick={() => setSelected('code')}
          style={{
            borderLeft: `2px solid ${selected === 'code' ? 'var(--c-purple)' : 'var(--c-border)'}`,
            paddingLeft: 'var(--s-7)',
            paddingBottom: 'var(--s-7)',
            marginBottom: 'var(--s-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s-4)',
              paddingBottom: 'var(--s-4)',
            }}
          >
            <Code size={12} style={{ color: 'var(--c-purple)' }} />
            <span className="mono">In [3]</span>
            <span style={{ flex: 1 }} />
            {selected === 'code' && (
              <Button variant="ghost">
                <Play size={11} weight="fill" /> Run
              </Button>
            )}
          </div>
          <CodeBlock
            collapsible={false}
            language="python"
            code={`records = list(SeqIO.parse("contigs.fasta", "fasta"))
print(f"{len(records)} contigs loaded")`}
          />
          <div style={{ marginTop: 'var(--s-4)' }}>
            <span className="mono">Out [3]</span>
            <pre className="mono" style={{ margin: 0, marginTop: 'var(--s-1)' }}>
              12847 contigs loaded
            </pre>
          </div>
        </div>

        <div
          onClick={() => setSelected('app')}
          style={{
            borderLeft: `2px solid ${selected === 'app' ? 'var(--c-primary)' : 'var(--c-border)'}`,
            paddingLeft: 'var(--s-7)',
            paddingBottom: 'var(--s-7)',
            marginBottom: 'var(--s-4)',
          }}
        >
          <JobPanel
            status="running"
            title="MEGAHIT Assembly"
            submitted="12 min ago"
            elapsed="12:34"
            progress={45}
            stages={[
              { label: 'Read filtering', status: 'complete' },
              { label: 'Assembly', status: 'running' },
              { label: 'Stats', status: 'queued' },
            ]}
            onCancel={() => {}}
          />
        </div>

        <div
          onClick={() => setSelected('md')}
          style={{
            borderLeft: `2px solid ${selected === 'md' ? 'var(--c-ink4)' : 'var(--c-border)'}`,
            paddingLeft: 'var(--s-7)',
            paddingTop: 'var(--s-4)',
            paddingBottom: 'var(--s-7)',
            marginBottom: 'var(--s-4)',
          }}
        >
          {selected === 'md' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--s-4)',
                paddingBottom: 'var(--s-4)',
              }}
            >
              <TextAa size={12} style={{ color: 'var(--c-ink4)' }} />
              <span className="note">Markdown</span>
            </div>
          )}
          <div className="body">
            Soil samples collected from rhizosphere of{' '}
            <span className="italic">Populus trichocarpa</span> at the ORNL field site. Expecting
            high microbial diversity given the seasonal sampling window.
          </div>
        </div>

        <div
          onClick={() => setSelected('report')}
          style={{
            borderLeft: `2px solid ${selected === 'report' ? 'var(--c-primary)' : 'var(--c-border)'}`,
            paddingLeft: 'var(--s-7)',
            paddingBottom: 'var(--s-7)',
            marginBottom: 'var(--s-4)',
          }}
        >
          <JobPanel
            status="complete"
            title="Assembly Quality Report"
            submitted="2 hours ago"
            elapsed="1:23:45"
            stages={[
              { label: 'Assembly', status: 'complete' },
              { label: 'Quality check', status: 'complete' },
              { label: 'Upload', status: 'complete' },
            ]}
          />
        </div>

        <div
          onClick={() => setSelected('data')}
          style={{
            borderLeft: `2px solid ${selected === 'data' ? 'var(--c-ocean)' : 'var(--c-border)'}`,
            paddingLeft: 'var(--s-7)',
            paddingTop: 'var(--s-4)',
            paddingBottom: 'var(--s-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-4)' }}>
            <Database size={12} style={{ color: 'var(--c-ocean)' }} />
            <span className="h4">Imported: soil_reads.fastq</span>
            <span className="mono-secondary">2.1 Gb</span>
          </div>
        </div>
      </div>
    </div>
  );
}
