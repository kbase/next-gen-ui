import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentType, KeyboardEvent } from 'react';
import { ArrowUpRight, CaretRight, CaretUpDown, Check } from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';
import { Menu, PromptInput, cx } from '@kbase/design-system';
import type { Prompt } from '../../plugins/sdk';
import type { Completion } from '../commands';
import { complete, parse, qualifiedName, resolve, usage } from '../commands';
import { pluginHostFor } from '../host/pluginHost';
import { openRoute } from '../host/open';
import { iconFor } from './icons';
import { PluginMark } from './PluginMark';
import { CartTray } from './CartTray';
import { useLayout, useRun, useServices } from './context';
import { focusPanelElement } from './useFocusSync';
import styles from './Workbench.module.css';

// A row in the bar's list, from either producer: a completion of a slash
// command, or a call the intent ranked. Only a completion carries the command
// it completes (`Completion.command`); a ranked row carries a `run` instead,
// for calls whose arguments no command string could carry. What is shared is
// the three fields both kinds of row render.
type BarSuggestion = Pick<Completion, 'value' | 'label' | 'detail'> & {
  run?: () => void;
  icon?: ComponentType<IconProps>;
  // A command name is code and set in the mono face; an offer is a
  // phrase and is not.
  mono?: boolean;
};

// The bottom bar. A leading slash makes it a command, completed from the
// registry before any plugin code loads; anything else goes to the
// assistant the user chose in Settings.
export function PromptBar() {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<BarSuggestion[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const services = useServices();
  const { registry, announcer, prompt, settings, source, cart, query, queryRunner } = services;
  const layout = useLayout();
  const run = useRun();
  const wrapper = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const listId = useId();
  const assistant = useSyncExternalStore(settings.subscribe, settings.get, settings.get).assistant;
  // Read here rather than inside the tray: a component that renders null is
  // still a non-null element, so passing it unconditionally would open the
  // composer's attachments row — border, padding and all — around nothing.
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);
  const inCart = cart.items().length;
  const queryVersion = useSyncExternalStore(query.subscribe, query.version, query.version);

  // The typing query: every plugin's terms and every plugin's offer on each
  // keystroke. A slash command is not a query.
  useEffect(() => {
    queryRunner.typed(parse(value).kind === 'prompt' ? value.trim() : '');
  }, [queryRunner, value]);

  const assistantTitle = assistant ? source.manifest(assistant)?.title : undefined;

  useEffect(
    () => prompt.register(() => wrapper.current?.querySelector('textarea')?.focus()),
    [prompt],
  );

  const submit = async (text: string) => {
    setError(null);
    const parsed = parse(text);
    if (parsed.kind === 'command') {
      const resolved = resolve(registry, text);
      if (!resolved.ok) {
        setError(resolved.message);
        announcer.announce(resolved.message);
        return;
      }
      setValue('');
      await run(qualifiedName(resolved.command), resolved.values);
      return;
    }
    if (!source.has(assistant, 'prompt')) {
      const message = `${assistantTitle ?? assistant} cannot answer prompts.`;
      setError(message);
      announcer.announce(message);
      return;
    }
    // The cart as it stands at send time. Cleared with the box below, the
    // attachments belong to the message the way a photo belongs to the roll
    // it was taken from — but a message and its attachments must survive a
    // failed send, so both are put back in `catch` if sending didn't happen.
    const attachments = cart.items();
    setValue('');
    cart.clear();
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      const handler = await source.module(assistant, 'prompt');
      await handler.handle(
        { text, terms: query.typing().pool, signal: controller.signal },
        { host: pluginHostFor(services, assistant), attachments },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The assistant failed.';
      setError(message);
      announcer.announce(message);
      // Only when nothing has superseded this send: a newer message already
      // owns the box and the cart, and this one's undo must not stomp it.
      if (abort.current === controller) {
        setValue(text);
        attachments.forEach((item) => cart.add(item));
      }
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setBusy(false);
      }
    }
  };

  // The rows for anything that is not a slash command, and the only place
  // they come from. The chosen intent ranks every candidate there is — each
  // plugin's declared commands, its launcher, its shortcut buttons, its pane,
  // and the offers the plugins made for this text — and the bar draws what it
  // returns in the order it returned. The workbench matches no text itself.
  // "dossier for P0AEX9" reaches Function Junction's open with q filled
  // whether or not that plugin recognised the text; "related" reaches the
  // Related pane the same way, through a call the host put in the catalog.
  const suggested = (text: string): BarSuggestion[] => {
    const top = query.typing().suggestions.slice(0, 4);
    return top.map(({ call, plugin, detail }) => {
      // Whose row it is, which for a pane or a launcher is not the plugin
      // whose command runs.
      const manifest = source.manifest(plugin ?? call.command.split(':')[0]);
      return {
        value: text,
        label: call.label,
        detail: detail ?? manifest?.title,
        icon: iconFor(manifest?.icon, manifest?.color),
        run: () => void run(call.command, call.args),
      };
    });
  };

  // Row zero is what Enter will do. Nothing is guessed: the assistant
  // stays the default and the alternatives sit under it, visible before
  // the key is pressed rather than hidden behind knowing to press down.
  const defaultSuggestion = (text: string): BarSuggestion[] => [
    {
      value: text,
      // `Ask` only fits a question, and most of what is typed here is
      // an accession or a name. Send is what the row does, and the word
      // the composer's own button already uses.
      label: `Send to ${assistantTitle ?? assistant}`,
      icon: iconFor(source.manifest(assistant)?.icon, source.manifest(assistant)?.color),
      run: () => void submit(text),
    },
  ];

  // Completion follows the text; a stale async result for older text is dropped.
  useEffect(() => {
    let live = true;
    // complete() answers [] for anything that is not a slash command.
    void complete(registry, value).then((list) => {
      if (!live) return;
      // A command's icon is its plugin's; the workbench's own have none.
      const commands: BarSuggestion[] = list.map((s) => {
        const manifest = source.manifest(s.command.source);
        return {
          ...s,
          mono: true,
          icon: manifest ? iconFor(manifest.icon, manifest.color) : undefined,
        };
      });
      // A slash command is completed from the registry and nothing else is
      // offered for it; anything else is the intent's answer under the Send
      // row. There is no precedence left to apply: one producer answered.
      // Nothing worth choosing between means no list, and Enter behaves as if
      // there were none. Browse is not appended as an escape: it is Home's
      // own command, ranked like any other when the text asks for it.
      const answers = list.length ? [] : suggested(value);
      const found = list.length
        ? commands
        : answers.length
          ? [...defaultSuggestion(value), ...answers]
          : [];
      setSuggestions(found);
      // Row zero is always the default action, so it is always selected;
      // arrowing away from it changes what Enter does, visibly.
      setHighlight(found.length ? 0 : -1);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the row builders are rebuilt every render, so listing them would refetch on every render; queryVersion stands for the query answers they read
  }, [value, registry, queryVersion]);

  const parsed = parse(value);
  const found = parsed.kind === 'command' ? registry.find(parsed.name) : undefined;
  const known = found?.ok ? found.command : undefined;
  // Free-text destination is the row above the bar; the hint slot only
  // ever explains the command being typed.
  const hint =
    parsed.kind === 'command' && known && known.args?.length
      ? `${usage(parsed.name, known.args)} — ${known.title}`
      : null;

  const accept = (s: BarSuggestion) => {
    // A row that acts has nothing to complete; a command completion is
    // text the user may still add arguments to.
    if (s.run) {
      setValue('');
      setSuggestions([]);
      s.run();
      return;
    }
    setValue(s.value);
    setSuggestions([]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (suggestions.length) setSuggestions([]);
      else focusPanelElement(layout.focus);
      return;
    }
    if (!suggestions.length) return;
    // The list opens upward, so the arrows follow the screen, not the
    // array: Up walks away from the field, Down walks back toward it.
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length : h) - 1);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      accept(suggestions[Math.max(0, highlight)]);
    } else if (event.key === 'Enter' && highlight >= 0) {
      const chosen = suggestions[highlight];
      // A row that acts always acts; a completion is skipped when it
      // would only retype what is already there.
      if (chosen.run || chosen.value !== value) {
        event.preventDefault();
        accept(chosen);
      }
    }
  };

  const open = suggestions.length > 0;
  return (
    <div ref={wrapper} className={styles.promptBar}>
      {open && (
        <ul id={listId} role="listbox" aria-label="Completions" className={styles.completions}>
          {suggestions.map((s, i) => (
            <li
              // By what the row says, so a suggestion that survives a
              // keystroke keeps its element; the position breaks a tie
              // between rows that say the same thing.
              key={`${s.label}\u0000${s.detail ?? ''}\u0000${suggestions.findIndex((o) => o.label === s.label && o.detail === s.detail) === i ? '' : i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={styles.completion}
              data-highlighted={i === highlight || undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                accept(s);
              }}
            >
              <span className={styles.completionIcon} aria-hidden="true">
                {s.icon ? <s.icon size={14} /> : null}
              </span>
              <span className={s.mono ? styles.completionLabel : styles.completionText}>
                {s.label}
              </span>
              {s.detail && <span className="caption">{s.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={(text) => void submit(text)}
        label="Prompt"
        placeholder="Type a name, an id, or a question — / for commands"
        hint={hint}
        error={error}
        busy={busy}
        onStop={() => abort.current?.abort()}
        footer={<PromptDestination />}
        // Inside the composer, because the cart is part of what Send sends.
        attachments={inCart > 0 ? <CartTray /> : undefined}
        maxRows={4}
        fieldProps={{
          role: 'combobox',
          'aria-expanded': open,
          'aria-controls': open ? listId : undefined,
          'aria-activedescendant': open && highlight >= 0 ? `${listId}-${highlight}` : undefined,
          'aria-autocomplete': 'list',
          onKeyDown,
        }}
      />
    </div>
  );
}

// Where free text will land, written as a trail: the assistant, then the
// conversation inside it that the message joins. The same shape as a panel's
// breadcrumbs, because it is the same kind of fact — a place inside a plugin —
// and the destination is a place the reader can also navigate to.
function PromptDestination() {
  const { source, settings } = useServices();
  const assistant = useSyncExternalStore(settings.subscribe, settings.get, settings.get).assistant;
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const manifest = source.manifest(assistant);
  const title = manifest?.title ?? assistant;
  const prompt = source.loaded(assistant, 'prompt');
  return (
    <p className={styles.promptContext}>
      <PluginMark
        icon={manifest?.icon}
        color={manifest?.color}
        size={13}
        className={styles.promptMark}
        aria-hidden="true"
      />
      <span className={styles.promptDestination}>{title}</span>
      {prompt && <AssistantContext assistant={assistant} prompt={prompt} />}
    </p>
  );
}

// New, in the host's own glyph: a chat bubble with a plus.
const NewIcon = iconFor('ChatCirclePlus');

// The destination control: a menu with New, which every assistant has,
// then the targets the plugin offers; and a jump to the destination's page.
// What it shows is whatever the host last took from the plugin's push.
function AssistantContext({ assistant, prompt }: { assistant: string; prompt: Prompt }) {
  const services = useServices();
  const { destination } = services;
  useSyncExternalStore(destination.subscribe, destination.version, destination.version);
  const context = destination.get();
  const label = context?.label ?? 'New conversation';
  const path = context?.path;
  const options = context?.options ?? [];
  const select = context?.select;
  return (
    <>
      <CaretRight size={11} className={styles.promptThread} aria-hidden="true" />
      <Menu.Root>
        <Menu.Trigger
          render={<button type="button" className={styles.promptTarget} />}
          aria-label={`Prompt destination: ${label}. Change destination`}
        >
          {label}
          <CaretUpDown size={12} aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Popup>
          <Menu.Item
            onClick={() =>
              void prompt.newConversation({ host: pluginHostFor(services, assistant) })
            }
          >
            <NewIcon size={14} aria-hidden="true" />
            New
          </Menu.Item>
          {options.length > 0 && select && <Menu.Separator />}
          {select &&
            options.map((option) => (
              <Menu.Item key={option.key} onClick={() => select(option.key)}>
                <Check
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  style={{ visibility: option.label === label ? 'visible' : 'hidden' }}
                />
                {option.label}
              </Menu.Item>
            ))}
        </Menu.Popup>
      </Menu.Root>
      {path !== undefined && (
        <button
          type="button"
          className={cx(styles.promptTarget, styles.promptJump)}
          aria-label={`Go to ${label}`}
          onClick={() => void openRoute(services, assistant, path)}
        >
          <ArrowUpRight size={13} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
