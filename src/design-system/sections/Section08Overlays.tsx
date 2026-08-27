import { useState, type FormEvent } from 'react';
import s from './showcase.module.scss';
import * as Dialog from '../components/Dialog';
import * as Field from '../components/Field';
import * as AlertDialog from '../components/AlertDialog';
import * as Tooltip from '../components/Tooltip';
import * as Popover from '../components/Popover';
import * as Menu from '../components/Menu';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CodeBlock } from '../components/CodeBlock';
import {
  CheckCircle,
  Info,
  Eye,
  Copy,
  Trash,
  PencilSimple,
  ShareNetwork,
} from '@phosphor-icons/react';

interface Section08OverlaysProps {
  onShowToast: () => void;
}

export function Section08Overlays({ onShowToast }: Section08OverlaysProps) {
  const [projectName, setProjectName] = useState('Soil Metagenome Assembly');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameSeed, setRenameSeed] = useState(projectName);

  function handleOpenChange(open: boolean) {
    // Seeded on open, not per render: the popup outlives the close, and Base
    // UI errors when a mounted uncontrolled field's defaultValue changes.
    if (open) setRenameSeed(projectName);
    setRenameOpen(open);
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get('name');
    setProjectName(String(name).trim());
    setRenameOpen(false);
  }

  return (
    <div className={s.section}>
      <div className={s.sNum}>08</div>
      <div className={s.sTitle}>Overlays</div>
      <p className={s.sDesc}>
        Tooltip for a quick hint, popover for richer detail, menu for a list of actions, dialog for
        a task, alert dialog for a decision, toast for transient feedback.
      </p>

      <div className={s.sub}>Tooltip</div>
      <p className={s.note}>Hover-triggered. Keep content short, one or two sentences.</p>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button variant="outline">
              <Info size={14} /> Hover me
            </Button>
          }
        />
        <Tooltip.Popup>
          Runs MEGAHIT + Prokka on your paired-end reads. Estimated time: 15 min.
        </Tooltip.Popup>
      </Tooltip.Root>
      <CodeBlock
        language="tsx"
        code={`<Tooltip.Root>
  <Tooltip.Trigger>Hover me</Tooltip.Trigger>
  <Tooltip.Popup>Brief explanation here.</Tooltip.Popup>
</Tooltip.Root>`}
      />

      <div className={s.sub}>Popover</div>
      <p className={s.note}>
        Click-triggered. Has Title and Description sub-components for structured content.
      </p>
      <Popover.Root>
        <Popover.Trigger
          render={
            <Button variant="outline">
              <Eye size={14} /> Assembly quality
            </Button>
          }
        />
        <Popover.Popup>
          <Popover.Title>Assembly quality</Popover.Title>
          <Popover.Description>
            N50: 8,241 bp. Total: 48.2 Mb across 12,847 contigs. GC: 52.3%. CheckM completeness:
            94.2%.
          </Popover.Description>
        </Popover.Popup>
      </Popover.Root>
      <CodeBlock
        language="tsx"
        code={`<Popover.Root>
  <Popover.Trigger>Click me</Popover.Trigger>
  <Popover.Popup>
    <Popover.Title>Title</Popover.Title>
    <Popover.Description>Detail content.</Popover.Description>
  </Popover.Popup>
</Popover.Root>`}
      />

      <div className={s.sub}>Menu</div>
      <p className={s.note}>Action list. Items support icons. Use Menu.Separator between groups.</p>
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline">Actions</Button>} />
        <Menu.Popup>
          <Menu.Item>
            <Copy size={14} /> Duplicate project
          </Menu.Item>
          <Menu.Item>
            <ShareNetwork size={14} /> Share with team
          </Menu.Item>
          <Menu.Item>
            <PencilSimple size={14} /> Rename
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item>
            <Trash size={14} /> Delete
          </Menu.Item>
        </Menu.Popup>
      </Menu.Root>
      <CodeBlock
        language="tsx"
        code={`<Menu.Root>
  <Menu.Trigger>Actions</Menu.Trigger>
  <Menu.Popup>
    <Menu.Item><Copy size={14} /> Duplicate</Menu.Item>
    <Menu.Separator />
    <Menu.Item><Trash size={14} /> Delete</Menu.Item>
  </Menu.Popup>
</Menu.Root>`}
      />

      <div className={s.sub}>Toast</div>
      <p className={s.note}>
        Transient feedback. Triggered via <code>useToastManager</code>; auto-dismisses after
        timeout. <code>actionProps</code> adds one control, and renders nothing when absent.
      </p>
      <Button variant="outline" onClick={onShowToast}>
        <CheckCircle size={14} /> Show toast
      </Button>
      <CodeBlock
        language="tsx"
        code={`const toasts = useToastManager();

toasts.add({
  title: 'Assembly complete',
  description: '12,847 contigs assembled.',
  timeout: 5000,
  actionProps: { children: 'View report', onClick: open },
});`}
      />

      <div className={s.sub}>Dialog</div>
      <p className={s.note}>
        A task the user can back out of. The backdrop and Escape both close it, as does
        Dialog.Close. Confirming action on the right.
      </p>
      <Dialog.Root open={renameOpen} onOpenChange={handleOpenChange}>
        <Dialog.Trigger
          render={
            <Button variant="outline">
              <PencilSimple size={14} /> Rename project
            </Button>
          }
        />
        <Dialog.Popup>
          <form onSubmit={handleRename}>
            <Dialog.Title>Rename project</Dialog.Title>
            <Dialog.Description>
              The new name is shown everywhere the project appears. Anyone it is shared with keeps
              their access.
            </Dialog.Description>
            <Field.Root>
              <Field.Label>Project name</Field.Label>
              <Input
                name="name"
                defaultValue={renameSeed}
                required
                // required accepts "   "; the pattern does not.
                pattern=".*\S.*"
                title="A name needs at least one non-space character."
              />
            </Field.Root>
            <div className={s.row} style={{ justifyContent: 'flex-end', marginTop: 'var(--s-7)' }}>
              <Dialog.Close
                render={
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                }
              />
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Root>
      <p className={s.note}>
        Current name: <strong>{projectName}</strong>
      </p>
      <p className={s.note}>
        A dialog that collects a value is a form &mdash; that is what makes Enter submit and gives
        the browser something to validate. It replaces <code>window.prompt</code>, which no design
        system ships as a component; <code>window.confirm</code> is AlertDialog, below.
      </p>
      <CodeBlock
        language="tsx"
        code={`const [open, setOpen] = useState(false);
const [seed, setSeed] = useState(project.name);

// Seeded on open, not per render: the popup outlives the close, and Base
// UI errors when a mounted uncontrolled field's defaultValue changes.
function handleOpenChange(next: boolean) {
  if (next) setSeed(project.name);
  setOpen(next);
}

function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get('name');
  rename(String(name).trim());
  setOpen(false);
}

<Dialog.Root open={open} onOpenChange={handleOpenChange}>
  <Dialog.Trigger>Rename</Dialog.Trigger>
  {/* No autoFocus: Base UI focuses the first tabbable element, except on
      touch, where it focuses the popup so the keyboard stays down. */}
  <Dialog.Popup>
    <form onSubmit={handleSubmit}>
      <Dialog.Title>Rename project</Dialog.Title>
      <Dialog.Description>The new name is shown everywhere.</Dialog.Description>
      <Field.Root>
        <Field.Label>Project name</Field.Label>
        {/* required alone accepts "   "; the pattern rejects whitespace. */}
        <Input name="name" defaultValue={seed} required pattern=".*\\S.*" />
      </Field.Root>
      {/* type="button", or Cancel submits the form too. */}
      <Dialog.Close render={<Button variant="ghost" type="button">Cancel</Button>} />
      {/* A plain Button, not a Dialog.Close: closing waits for the handler. */}
      <Button type="submit">Save</Button>
    </form>
  </Dialog.Popup>
</Dialog.Root>`}
      />

      <div className={s.sub}>Alert dialog</div>
      <p className={s.note}>
        For destructive or irreversible actions. Dialog's parts with{' '}
        <code>role=&quot;alertdialog&quot;</code>. The backdrop does not dismiss it; Escape does, so
        Escape must cancel, never confirm. Name the action in each button and put its consequences
        in the description.
      </p>
      <AlertDialog.Root>
        <AlertDialog.Trigger
          render={
            <Button variant="danger">
              <Trash size={14} /> Delete project
            </Button>
          }
        />
        <AlertDialog.Popup>
          <AlertDialog.Title>Delete project?</AlertDialog.Title>
          <AlertDialog.Description>
            This permanently deletes &quot;Soil Metagenome Assembly&quot; and all 47 data objects in
            it. Collaborators lose access. This cannot be undone.
          </AlertDialog.Description>
          <div className={s.row} style={{ justifyContent: 'flex-end' }}>
            <AlertDialog.Close render={<Button variant="ghost">Keep project</Button>} />
            <AlertDialog.Close
              render={
                <Button variant="danger">
                  <Trash size={14} /> Delete
                </Button>
              }
            />
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Root>
      <CodeBlock
        language="tsx"
        code={`<AlertDialog.Root>
  <AlertDialog.Trigger render={<Button variant="danger">Delete project</Button>} />
  <AlertDialog.Popup>
    <AlertDialog.Title>Delete project?</AlertDialog.Title>
    <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
    <AlertDialog.Close render={<Button variant="ghost">Keep project</Button>} />
    <AlertDialog.Close render={<Button variant="danger">Delete</Button>} />
  </AlertDialog.Popup>
</AlertDialog.Root>`}
      />
    </div>
  );
}
