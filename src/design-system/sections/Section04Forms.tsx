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
import { CodeBlock } from '../components/CodeBlock';
import { Play, PaperPlaneRight } from '@phosphor-icons/react';
import css from './Section04Forms.module.scss';

export function Section04Forms() {
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
        Controlled pill with search icon and clear-on-type. For filtering data, not open-ended
        queries.
      </p>
      <SearchBar
        value=""
        onValueChange={() => {}}
        placeholder="Search genomes, assemblies, models..."
      />
      <CodeBlock
        language="tsx"
        code={`<SearchBar value={query} onValueChange={setQuery} placeholder="Search genomes..." />`}
      />

      <div className={s.sub}>Prompt input</div>
      <p className={s.note}>
        A layout pattern, not a component. Frame + textarea + border + action footer. For open-ended
        input: AI assist, natural language, chat (see appendix E).
      </p>
      <Frame paddingY={5} paddingX={6} className={css.promptInput}>
        <textarea
          rows={2}
          placeholder="Describe the analysis you want to run, or search for data…"
          className={css.textarea}
        />
        <Button variant="primary" size="sm" aria-label="Run prompt">
          <PaperPlaneRight size={12} weight="bold" />
        </Button>
      </Frame>

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
