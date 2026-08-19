import s from './showcase.module.scss';
import * as Dialog from '../components/Dialog';
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
        timeout.
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
});`}
      />

      <div className={s.sub}>Dialog</div>
      <p className={s.note}>
        A task the user can back out of. The backdrop and Escape both close it, as does
        Dialog.Close. Confirming action on the right.
      </p>
      <Dialog.Root>
        <Dialog.Trigger
          render={
            <Button variant="outline">
              <PencilSimple size={14} /> Rename project
            </Button>
          }
        />
        <Dialog.Popup>
          <Dialog.Title>Rename project</Dialog.Title>
          <Dialog.Description>
            The new name is shown everywhere the project appears. Anyone it is shared with keeps
            their access.
          </Dialog.Description>
          <Input defaultValue="Soil Metagenome Assembly" aria-label="Project name" />
          <div className={s.row} style={{ justifyContent: 'flex-end', marginTop: 'var(--s-7)' }}>
            <Dialog.Close render={<Button variant="ghost">Cancel</Button>} />
            <Dialog.Close>Save</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Root>
      <CodeBlock
        language="tsx"
        code={`<Dialog.Root>
  <Dialog.Trigger>Rename</Dialog.Trigger>
  <Dialog.Popup>
    <Dialog.Title>Rename project</Dialog.Title>
    <Dialog.Description>The new name is shown everywhere.</Dialog.Description>
    <Dialog.Close render={<Button variant="ghost">Cancel</Button>} />
    <Dialog.Close>Save</Dialog.Close>
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
