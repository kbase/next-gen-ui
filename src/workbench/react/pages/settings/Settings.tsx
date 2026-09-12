import { useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Chip, Radio, Switch } from '@kbase/design-system';
import { usePanelTitle } from '../../../../plugins/sdk';
import type { Command } from '../../../commands';
import {
  DEFAULT_KEYBINDINGS,
  boundCommand,
  chordFor,
  chordFromEvent,
  chordToString,
  keybindingTable,
  parseChord,
  qualifiedName,
  setKeybinding,
} from '../../../commands';
import { useLayout, useRun, useServices } from '../../context';
import { iconFor } from '../../icons';
import styles from './Settings.module.css';

// The host's own page: what is installed, what is pinned, which plugin
// answers the prompt bar and which suggests commands for it. Reaches host services directly, which no plugin
// over the SDK can.
export function SettingsDocument() {
  usePanelTitle('Settings');
  const { source, settings } = useServices();
  const layout = useLayout();
  const run = useRun();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const current = useSyncExternalStore(settings.subscribe, settings.get, settings.get);
  const manifests = source.manifests().filter((m) => m.id !== 'settings');
  const assistants = manifests.filter((m) => m.modules.includes('prompt'));
  const intents = manifests.filter((m) => m.modules.includes('intent'));

  return (
    <div className={styles.root}>
      <section aria-labelledby="settings-installed" className={styles.section}>
        <h2 id="settings-installed" className="h4">
          Installed
        </h2>
        <ul className={styles.list}>
          {manifests.map((m) => {
            const Icon = iconFor(m.icon, m.color);
            const pinned = layout.sidebar.pinned.includes(m.id);
            const loaded = source.anyLoaded(m.id);
            return (
              <li key={m.id} className={styles.row}>
                <span className={styles.rowIcon} aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span className={styles.rowTitle}>
                  <span className="body">{m.title}</span>
                  {loaded && <Chip color="green" label="loaded" />}
                </span>
                {source.has(m.id, 'pane') && (
                  <span className={styles.rowControls}>
                    <span className="caption">Pinned</span>
                    <Switch
                      checked={pinned}
                      onCheckedChange={(v) =>
                        run(v ? 'workbench:pin' : 'workbench:unpin', { plugin: m.id })
                      }
                      aria-label={`Pin ${m.title} to the sidebar`}
                    />
                  </span>
                )}
                {m.description && <p className={`caption ${styles.rowDesc}`}>{m.description}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="settings-assistant" className={styles.section}>
        <h2 id="settings-assistant" className="h4">
          Assistant
        </h2>
        <p className="caption">Which plugin answers free text typed in the prompt bar.</p>
        <Radio.Group
          aria-labelledby="settings-assistant"
          value={current.assistant}
          onValueChange={(value) => settings.set({ assistant: String(value) })}
          style={{ display: 'grid', gap: 'var(--s-2)' }}
        >
          {assistants.map((m) => (
            <label key={m.id} className={styles.assistantRow}>
              <Radio.Radio value={m.id} />
              <span className="body">{m.title}</span>
            </label>
          ))}
        </Radio.Group>
      </section>

      <section aria-labelledby="settings-intent" className={styles.section}>
        <h2 id="settings-intent" className="h4">
          Suggestions
        </h2>
        <p className="caption">
          Which plugin ranks what is typed in the prompt bar. Every row under the box, apart from
          sending the text to the assistant, comes from it.
        </p>
        <Radio.Group
          aria-labelledby="settings-intent"
          value={current.intent}
          onValueChange={(value) => settings.set({ intent: String(value) })}
          style={{ display: 'grid', gap: 'var(--s-2)' }}
        >
          {intents.map((m) => (
            <label key={m.id} className={styles.assistantRow}>
              <Radio.Radio value={m.id} />
              <span className="body">{m.title}</span>
            </label>
          ))}
        </Radio.Group>
      </section>

      <Keyboard />
    </div>
  );
}

// A command a keypress can run: one that needs no argument, because a
// keystroke carries none.
function bindable(command: Command): boolean {
  return !(command.args ?? []).some((arg) => arg.required);
}

// Workbench commands first, then each plugin's, alphabetically within both,
// so a reader looking for a command finds it beside its neighbours.
function byOwner(a: Command, b: Command): number {
  const host = (c: Command) => (c.source === 'workbench' ? 0 : 1);
  return host(a) - host(b) || qualifiedName(a).localeCompare(qualifiedName(b));
}

// The keys. Every bindable command is a row showing the chord that runs it,
// so the table the user edits and the table a keypress is matched against
// are the same thing read two ways.
function Keyboard() {
  const { registry, settings } = useServices();
  useSyncExternalStore(registry.subscribe, registry.version);
  const current = useSyncExternalStore(settings.subscribe, settings.get, settings.get);
  // Which row is listening for a chord, and what the last attempt collided
  // with. One at a time: recording swallows every key, so two rows listening
  // would be two claims on the same keypress.
  const [recording, setRecording] = useState<string | null>(null);
  const [taken, setTaken] = useState<{ row: string; holder: string } | null>(null);

  const overrides = current.keybindings;
  const table = keybindingTable({
    overrides,
    exists: (command) => registry.get(command) !== undefined,
  });
  const commands = registry.list().filter(bindable).sort(byOwner);

  const write = (command: string, chord: string | null) => {
    settings.set({ keybindings: setKeybinding(overrides, command, chord) });
    setRecording(null);
    setTaken(null);
  };

  // Every key reaches this while a row is recording, including the ones that
  // are bound: stopPropagation keeps the press away from the window listener
  // in useKeybindings, which would otherwise run the command being rebound.
  const record = (event: KeyboardEvent, command: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      setRecording(null);
      setTaken(null);
      return;
    }
    // A modifier on its own is half a chord; wait for the key it modifies.
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;
    const chord = chordToString(chordFromEvent(event));
    const holder = boundCommand(table, parseChord(chord));
    if (holder && holder !== command) {
      // Refused, and the row keeps listening: the user picks another chord
      // rather than silently taking a key off the command that holds it.
      setTaken({ row: command, holder });
      return;
    }
    write(command, chord);
  };

  return (
    <section aria-labelledby="settings-keyboard" className={styles.section}>
      <h2 id="settings-keyboard" className="h4">
        Keyboard
      </h2>
      <p className="caption">
        Which keys run which command. A command that needs an argument is not here: a keypress
        supplies none.
      </p>
      <ul className={styles.list}>
        {commands.map((command) => {
          const name = qualifiedName(command);
          const chord = chordFor(table, name);
          const fallback = chordFor(DEFAULT_KEYBINDINGS, name);
          const held = taken?.row === name ? taken.holder : null;
          return (
            <li key={name} className={styles.keyRow}>
              <span className={styles.keyTitle}>
                <span className="body">{command.title}</span>
                <span className={`caption ${styles.keyName}`}>/{name}</span>
              </span>
              {chord ? (
                <kbd className={styles.chord}>{chord}</kbd>
              ) : (
                <span className={`caption ${styles.keyNone}`}>No key</span>
              )}
              <span className={styles.rowControls}>
                <Button
                  size="xs"
                  variant={recording === name ? 'primary' : 'outline'}
                  aria-label={`${chord ? 'Change' : 'Set'} the key for ${command.title}`}
                  aria-describedby={held ? `${name}-taken` : undefined}
                  onClick={() => {
                    setRecording(recording === name ? null : name);
                    setTaken(null);
                  }}
                  onKeyDown={(event) => {
                    if (recording === name) record(event, name);
                  }}
                  onBlur={() => {
                    if (recording === name) setRecording(null);
                  }}
                >
                  {recording === name ? 'Press a key' : chord ? 'Change' : 'Set'}
                </Button>
                {chord && (
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={`Remove the key for ${command.title}`}
                    onClick={() => write(name, null)}
                  >
                    Remove
                  </Button>
                )}
                {/* Only where there is a default to go back to: a command
                    with none is reset by Remove. */}
                {fallback !== null && chord !== fallback && (
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={`Reset the key for ${command.title}`}
                    onClick={() => write(name, fallback)}
                  >
                    Reset
                  </Button>
                )}
              </span>
              {recording === name && (
                <p className={`caption ${styles.keyHint}`} id={`${name}-taken`} role="status">
                  {held
                    ? `That key runs ${registry.get(held)?.title ?? held}. Press another, or Escape to stop.`
                    : 'Press the key to run this command, or Escape to stop.'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
