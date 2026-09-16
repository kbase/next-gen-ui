import { useState } from 'react';
import type { RefObject } from 'react';
import { Button, CopyButton, Dialog } from '@kbase/design-system';
import { SDK_VERSION } from '@kbase/plugin-sdk';
import { AddPluginForm } from '../../AddPlugin/AddPluginForm';
import { skillMarkdown } from './skill';
import styles from './Docs.module.css';

// The demo of the page: an agent is handed the page as a skill, builds a
// plugin from it, and the plugin is installed from the URL the agent reports.
// The skill is built when the dialog opens, from the article as rendered.
export function TryIt({ article }: { article: RefObject<HTMLElement | null> }) {
  const [open, setOpen] = useState(false);
  const [skill, setSkill] = useState('');
  const onOpenChange = (next: boolean) => {
    if (next && article.current) {
      setSkill(
        skillMarkdown(article.current, { origin: location.origin, sdkVersion: SDK_VERSION }),
      );
    }
    setOpen(next);
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger
        render={
          <Button variant="outline" data-skip>
            Try making an app
          </Button>
        }
      />
      <Dialog.Popup>
        <Dialog.Title>Try making an app</Dialog.Title>
        <Dialog.Description>
          A coding agent builds a plugin from this page; the workbench installs it from the URL the
          agent reports, without a reload.
        </Dialog.Description>
        <div className="prose">
          <ol>
            <li>Copy the skill and give it to the agent, with what the app should do.</li>
            <li>
              The agent builds and serves the plugin and ends with a line{' '}
              <code>Manifest: &lt;url&gt;</code>.
            </li>
            <li>
              Paste that URL below. The plugin is listed under Installed in Settings, where it can
              be removed.
            </li>
          </ol>
        </div>
        <div>
          <CopyButton text={skill} label="Copy skill" variant="outline" />
        </div>
        <AddPluginForm />
        <p className="caption">
          This browser fetches the plugin from that URL, so the server must send{' '}
          <code className={styles.inline}>Access-Control-Allow-Origin</code> for this origin, and on
          an https workbench an <code className={styles.inline}>http://</code> URL works only from{' '}
          <code className={styles.inline}>127.0.0.1</code> on this machine. Installing by URL is for
          a development or demo workbench; a production deployment loads scripts from its own origin
          only.
        </p>
        <div className={styles.dialogRow}>
          <Dialog.Close
            render={
              <Button variant="ghost" type="button">
                Close
              </Button>
            }
          />
        </div>
      </Dialog.Popup>
    </Dialog.Root>
  );
}
