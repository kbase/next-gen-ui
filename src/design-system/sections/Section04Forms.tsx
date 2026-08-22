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
import { Frame } from '../components/Frame';
import { Separator } from '../components/Separator';
import { SearchBar } from '../components/SearchBar';
import { Autocomplete } from '../components/Autocomplete';
import { CodeBlock } from '../components/CodeBlock';
import { Play, PaperPlaneRight } from '@phosphor-icons/react';
import css from './Section04Forms.module.scss';

const PROJECTS = [
  'Soil Metagenome Assembly',
  'Ocean Sampling 2025',
  'Soil Carbon Flux',
  'Permafrost Cores',
];

export function Section04Forms() {
  const [prompt, setPrompt] = useState('');
  const [project, setProject] = useState('Soil Carbon Flux');

  // The button is disabled when blank, Enter is not, so the guard lives here.
  function sendPrompt() {
    if (prompt.trim()) setPrompt('');
  }
  return (
    <div className={s.section}>
      <div className={s.sNum}>04</div>
      <div className={s.sTitle}>Forms</div>
      <p className={s.sDesc}>
        Thin wrappers over Base UI with KBase styling. See Base UI docs for the full control API;
        below covers what we add and how controls compose.
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
        Disabled controls use dashed border. The border tells you before the cursor does.
      </p>

      <div className={s.sub}>SearchBar</div>
      <p className={s.note}>
        A filter field: it narrows a list someone else is already rendering. It owns no list of its
        own and picks nothing, so it has no listbox and no active option. A field that owns its own
        list is an Autocomplete, below.
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
        For &ldquo;pick an existing one or name a new one&rdquo;. The suggestions narrow as you
        type, and anything you type is a valid value, which is what separates it from Select, which
        accepts only what it lists. Screen readers call it a combobox. Use <code>emptyMessage</code>{' '}
        to say what happens to a value that matches nothing, since an empty list otherwise reads as
        a rejection.
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
        A layout pattern, not a component: a Frame around a <code>Textarea</code> and its action.
        For open-ended input &mdash; AI assist, natural language, chat (see appendix E). Type a few
        lines to see <code>autoGrow</code>; Enter sends and Shift+Enter breaks the line.
      </p>
      <Frame paddingY={5} paddingX={6} className={css.promptInput}>
        <Textarea
          rows={1}
          autoGrow
          maxRows={6}
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={sendPrompt}
          placeholder="Describe the analysis you want to run, or search for data…"
          aria-label="Prompt"
          className={css.textarea}
        />
        <Button
          variant="primary"
          size="sm"
          aria-label="Run prompt"
          disabled={!prompt.trim()}
          onClick={sendPrompt}
          className={css.send}
        >
          <PaperPlaneRight size={14} weight="bold" />
        </Button>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Frame className={styles.composer}>
  <Textarea
    autoGrow
    maxRows={6}
    value={prompt}
    onValueChange={setPrompt}
    onSubmit={send}
    className={styles.field}
  />
  <Button disabled={!prompt.trim()} onClick={send}>Run</Button>
</Frame>

/* Doubled: a single class ties with Textarea's own and falls to
   emit order. Zero the custom properties too, or autoGrow's
   max-height counts a border and padding that are no longer drawn. */
.field.field {
  --textarea-pad-y: 0px;
  --textarea-border: 0px;
  padding: 0;
  border: none;
}

/* :focus and :disabled are (0,2,0) too, so match them. */
.field.field:focus,
.field.field:disabled {
  box-shadow: none;
}

/* The field has no border left to light, so the surface shows focus.
   Keyed on the textarea: a focused Run shows its own ring. */
.composer:has(textarea:focus) {
  box-shadow: 0 0 0 3px var(--c-focus);
}`}
      />

      <div className={s.sub}>Composed form</div>
      <p className={s.note}>
        All controls together inside a Frame. Separator divides groups. Field wraps inputs that need
        labels.
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
    </div>
  );
}
