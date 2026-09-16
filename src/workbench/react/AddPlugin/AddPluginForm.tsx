import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Field, Input } from '@kbase/design-system';
import { useServices } from '../context';
import styles from './AddPluginForm.module.css';

type State =
  | { kind: 'idle' }
  | { kind: 'adding' }
  | { kind: 'error'; message: string }
  | { kind: 'added'; title: string };

// One field, the URL of a plugin's manifest, and Add, which runs `/install`.
// A rejection is shown under the field rather than toasted: the person who
// typed the URL is looking here, and the sentence names what to fix.
export function AddPluginForm() {
  const { registry, source } = useServices();
  const [url, setUrl] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = url.trim();
    if (!value || state.kind === 'adding') return;
    setState({ kind: 'adding' });
    try {
      await registry.run('workbench:install', { url: value }, 'user');
      const id = new URL(value).pathname.split('/').at(-2) ?? value;
      setState({ kind: 'added', title: source.manifest(id)?.title ?? id });
      setUrl('');
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <form onSubmit={submit} className={styles.form}>
      <Field.Root invalid={state.kind === 'error'}>
        <Field.Label>Manifest URL</Field.Label>
        <div className={styles.row}>
          <Input
            type="url"
            value={url}
            onValueChange={setUrl}
            placeholder="http://127.0.0.1:8899/services/hello/manifest.json"
            required
          />
          <Button type="submit" disabled={state.kind === 'adding'}>
            {state.kind === 'adding' ? 'Adding' : 'Add'}
          </Button>
        </div>
        {state.kind === 'error' && <Field.Error match>{state.message}</Field.Error>}
      </Field.Root>
      {state.kind === 'added' && (
        <p className="caption" role="status">
          {state.title} is installed.
        </p>
      )}
    </form>
  );
}
