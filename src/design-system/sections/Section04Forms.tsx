import { useState } from 'react';
import s from './showcase.module.scss';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Switch } from '../components/Switch';
import * as Radio from '../components/Radio';
import * as Select from '../components/Select';
import * as Field from '../components/Field';
import { Textarea } from '../components/Textarea';
import { PromptInput } from '../components/PromptInput';
import { Frame } from '../components/Frame';
import { Separator } from '../components/Separator';
import { SearchBar } from '../components/SearchBar';
import { Autocomplete } from '../components/Autocomplete';
import { CodeBlock } from '../components/CodeBlock';
import { SegmentedControl } from '../components/SegmentedControl';
import { Play } from '@phosphor-icons/react';

const PROJECTS = [
  'Soil Metagenome Assembly',
  'Ocean Sampling 2025',
  'Soil Carbon Flux',
  'Permafrost Cores',
];

export function Section04Forms() {
  const [prompt, setPrompt] = useState('');
  const [project, setProject] = useState('Soil Carbon Flux');

  const [running, setRunning] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  function sendPrompt() {
    setPrompt('');
    setRunning(true);
  }
  return (
    <div className={s.section}>
      <div className={s.sNum}>04</div>
      <div className={s.sTitle}>Forms</div>
      <p className={s.sDesc}>
        Thin wrappers over Base UI with KBase styling. Base UI documents the full control API; this
        section covers the additions and how the controls compose.
      </p>

      <div className={s.sub}>Field</div>
      <p className={s.note}>
        Wraps any control with label, description, and validation. Set <code>invalid</code> on Root;
        Field.Error appears automatically.
      </p>
      <div className={s.row} style={{ alignItems: 'flex-start', gap: 'var(--s-9)' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Field.Root>
            <Field.Label>Workspace name</Field.Label>
            <Input placeholder="my-workspace" />
            <Field.Description>Lowercase, numbers, hyphens only.</Field.Description>
          </Field.Root>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Field.Root invalid>
            <Field.Label>Output name</Field.Label>
            <Input defaultValue="My Assembly!!" style={{ borderColor: 'var(--bo-red)' }} />
            <Field.Error>Name contains invalid characters.</Field.Error>
          </Field.Root>
        </div>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Field.Root invalid={hasError}>
  <Field.Label>Output name</Field.Label>
  <Input defaultValue="..." />
  <Field.Description>Helper text.</Field.Description>
  <Field.Error>Shown when invalid.</Field.Error>
</Field.Root>`}
      />

      <div className={s.sub}>Input</div>
      <p className={s.note}>
        Standard or <code>variant="pill"</code> for inline search in headers.
      </p>
      <div className={s.row}>
        <div style={{ flex: 1 }}>
          <Input placeholder="Standard" />
        </div>
        <div style={{ width: 160 }}>
          <Input variant="pill" placeholder="Pill" />
        </div>
      </div>

      <div className={s.sub}>Selection controls</div>
      <p className={s.note}>
        Checkbox, Switch, Radio, and Select are styled Base UI, with no custom props.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        <div className={s.row}>
          <label className={s.controlLabel}>
            <Checkbox defaultChecked /> Quality filtering
          </label>
          <label className={s.controlLabel}>
            <Checkbox /> Plasmid detection
          </label>
          <label className={s.controlLabel}>
            <Checkbox disabled /> GPU{' '}
            <span style={{ fontSize: 'var(--fs-4)', color: 'var(--c-ink5)' }}>(unavailable)</span>
          </label>
        </div>
        <div className={s.row}>
          <label className={s.controlLabel}>
            <Switch defaultChecked /> Email when done
          </label>
        </div>
        <Radio.Group defaultValue="paired">
          <div className={s.row}>
            <label className={s.controlLabel}>
              <Radio.Radio value="paired" /> Paired-end
            </label>
            <label className={s.controlLabel}>
              <Radio.Radio value="single" /> Single-end
            </label>
            <label className={s.controlLabel}>
              <Radio.Radio value="long" /> Long reads
            </label>
          </div>
        </Radio.Group>
        <div style={{ width: 200 }}>
          <Select.Root defaultValue="megahit">
            <Select.Trigger />
            <Select.Popup>
              <Select.Item value="megahit">MEGAHIT</Select.Item>
              <Select.Item value="spades">SPAdes</Select.Item>
              <Select.Item value="velvet">Velvet</Select.Item>
            </Select.Popup>
          </Select.Root>
        </div>
      </div>
      <p className={s.note}>
        Disabled controls use a dashed border, so the state is visible before hovering.
      </p>

      <div className={s.sub}>SearchBar</div>
      <p className={s.note}>
        A filter field: it narrows a list that something else renders. It holds no list and selects
        nothing, so it has no listbox and no active option. For a field with a list of its own, use
        Autocomplete, below.
      </p>
      <SearchBar
        value=""
        onValueChange={() => {}}
        placeholder="Search genomes, assemblies, models..."
        aria-label="Search genomes"
      />
      <CodeBlock
        language="tsx"
        code={`<SearchBar value={query} onValueChange={setQuery} placeholder="Search genomes..." />`}
      />

      <div className={s.sub}>Autocomplete</div>
      <p className={s.note}>
        For &ldquo;pick an existing one or name a new one&rdquo;. Any typed value is valid, which is
        what separates it from Select, which accepts only what it lists. Screen readers call it a
        combobox. Use <code>emptyMessage</code> to say what happens to a value that matches nothing,
        since an empty list otherwise reads as a rejection.
      </p>
      <div style={{ maxWidth: 320 }}>
        <Field.Root>
          <Field.Label>Project</Field.Label>
          <Autocomplete
            items={PROJECTS}
            value={project}
            onValueChange={setProject}
            emptyMessage="No project by that name. It is created on save."
            placeholder="Existing project, or a new name"
          />
          <Field.Description>Filed under {project.trim() || 'no project'}.</Field.Description>
        </Field.Root>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Field.Root>
  <Field.Label>Project</Field.Label>
  <Autocomplete
    items={projectNames}
    value={project}
    onValueChange={setProject}
    emptyMessage="No project by that name. It is created on save."
  />
</Field.Root>`}
      />

      <div className={s.sub}>Prompt input</div>
      <p className={s.note}>
        Open-ended input &mdash; AI assist, natural language, chat (see appendix E). Owns the
        border, the focus ring, the send button and the error region, so a consumer supplies text
        and a callback. Type a few lines to see it grow; send to see the button become a stop.
      </p>
      <PromptInput
        label="Prompt"
        value={prompt}
        onValueChange={setPrompt}
        onSubmit={sendPrompt}
        placeholder="Describe the analysis you want to run, or search for data…"
        busy={running}
        onStop={() => setRunning(false)}
      />
      <CodeBlock
        language="tsx"
        code={`<PromptInput
  label="Prompt"
  value={prompt}
  onValueChange={setPrompt}
  onSubmit={send}
  placeholder="Describe the analysis you want to run…"
  hint="Enter to send · Shift+Enter for a new line"
  error={failure}
  busy={running}
  onStop={interrupt}
/>

/* submitOn="modifier" makes Enter a newline and Ctrl/⌘+Enter the send,
   for long-form prose. A soft keyboard has neither modifier, so it
   gets that behavior in both modes and the button is the only send. */`}
      />

      <div className={s.sub}>Composed form</div>
      <p className={s.note}>
        Frame provides the surface, Field the labels, and Separator the group breaks. The controls
        need no further wrapping.
      </p>
      <Frame padding={8}>
        <div className="h2" style={{ marginBottom: 'var(--s-7)' }}>
          New annotation job
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--s-9)',
            flexWrap: 'wrap',
            marginBottom: 'var(--s-7)',
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field.Root>
              <Field.Label>Workspace name</Field.Label>
              <Input placeholder="my-workspace" />
              <Field.Description>Lowercase, numbers, hyphens only.</Field.Description>
            </Field.Root>
          </div>
          <div style={{ width: 200 }}>
            <Field.Root>
              <Field.Label>Assembly method</Field.Label>
              <Select.Root defaultValue="megahit">
                <Select.Trigger />
                <Select.Popup>
                  <Select.Item value="megahit">MEGAHIT</Select.Item>
                  <Select.Item value="spades">SPAdes</Select.Item>
                </Select.Popup>
              </Select.Root>
            </Field.Root>
          </div>
        </div>
        <Field.Root>
          <Field.Label>Description</Field.Label>
          <Textarea rows={2} placeholder="What are you analyzing and why?" />
        </Field.Root>
        <Separator />
        <div
          style={{
            marginTop: 'var(--s-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <label className={s.controlLabel}>
            <Switch defaultChecked /> Email when done
          </label>
          <div className={s.row}>
            <Button variant="ghost">Cancel</Button>
            <Button variant="primary">
              <Play size={14} weight="bold" /> Run analysis
            </Button>
          </div>
        </div>
      </Frame>

      <div className={s.sub}>Density</div>
      <p className={s.note}>
        <code>data-density=&quot;compact&quot;</code> on any element sets every control and row
        below it to the <code>sm</code> tier; a component&apos;s own <code>size</code> prop outranks
        it. The attribute is plain HTML, so it works the same from Solara or a static page. Popups
        are portaled to <code>&lt;body&gt;</code> and do not inherit from a region &mdash; set the
        attribute on <code>&lt;html&gt;</code> or pass <code>size</code> to the popup part.
      </p>
      <div className={s.row} style={{ marginBottom: 'var(--s-5)' }}>
        <SegmentedControl
          value={density}
          onChange={(v) => setDensity(v as 'comfortable' | 'compact')}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </div>
      <Frame padding={6}>
        <div data-density={density} className={s.row}>
          <div style={{ flex: 1 }}>
            <Input placeholder="Inherits the region" />
          </div>
          <Select.Root defaultValue="Perlmutter">
            <Select.Trigger style={{ width: 160 }} />
            <Select.Popup size={density === 'compact' ? 'sm' : undefined}>
              <Select.Item value="Perlmutter">Perlmutter</Select.Item>
              <Select.Item value="KBase">KBase</Select.Item>
            </Select.Popup>
          </Select.Root>
          <Button variant="primary">Submit</Button>
          <Button variant="outline" size="xs">
            Always xs
          </Button>
        </div>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<div data-density="compact">
  <Input />                              {/* sm, inherited */}
  <Select.Popup size="sm">…</Select.Popup>  {/* portaled: told explicitly */}
  <Button size="xs">Always xs</Button>   {/* own attribute wins */}
</div>`}
      />
    </div>
  );
}
