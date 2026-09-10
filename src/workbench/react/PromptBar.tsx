import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentType, KeyboardEvent } from 'react';
import { ArrowUpRight, CaretRight, CaretUpDown, Check } from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';
import { Menu, PromptInput, cx } from '@kbase/design-system';
import type { Destination, Manifest, Prompt } from '../../plugins/sdk';
import { qualifyCommand } from '../../plugins/sdk';
import type { Suggestion } from '../commands';
import { complete, parse, qualifiedName, resolve, usage } from '../commands';
import { pluginHostFor } from '../host/createWorkbench';
import { openPane, openRoute } from '../host/open';
import { iconFor } from '../host/icons';
import { PluginMark } from '../host/PluginMark';
import { CartTray } from './CartTray';
import { useLayout, useRun, useServices } from './context';
import { focusPanelElement } from './useFocusSync';
import styles from './Workbench.module.css';

// A suggestion that acts directly, for offers whose params no command
// string could carry, and that says whose it is.
type BarSuggestion = Suggestion & {
  run?: () => void;
  icon?: ComponentType<IconProps>;
  // A command name is code and set in the mono face; an offer is a
  // phrase and is not.
  mono?: boolean;
};

// The bottom bar. A leading slash makes it a command, completed from the
// registry before any plugin code loads; anything else goes to the
// assistant the user chose in the catalog.
export function PromptBar() {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<BarSuggestion[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const services = useServices();
  const { registry, announcer, prompt, settings, source, preview, cart, query, queryRunner } =
    services;
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

  // The typing query: every plugin's terms on each keystroke, every
  // recommend once it settles. A slash command is not a query.
  useEffect(() => {
    queryRunner.set('typing', { text: parse(value).kind === 'prompt' ? value.trim() : '' });
  }, [queryRunner, value]);

  // Fetched when Settings names the plugin, so the destination row can be
  // drawn before the first message is sent.
  useEffect(() => {
    if (assistant && source.has(assistant, 'prompt')) {
      source.module(assistant, 'prompt').catch(() => undefined);
    }
  }, [assistant, source]);
  const assistantTitle = assistant ? source.manifest(assistant)?.title : undefined;

  useEffect(
    () => prompt.register(() => wrapper.current?.querySelector('textarea')?.focus()),
    [prompt],
  );

  const ctx = () => ({
    focusKind: layout.focus ? (layout.panels[layout.focus]?.kind ?? null) : null,
  });

  const submit = async (text: string) => {
    setError(null);
    const parsed = parse(text);
    if (parsed.kind === 'command') {
      const resolved = resolve(registry, text, ctx());
      if (!resolved.ok) {
        setError(resolved.message);
        announcer.announce(resolved.message);
        return;
      }
      setValue('');
      await run(qualifiedName(resolved.command), resolved.values);
      return;
    }
    if (!assistant) {
      const message = 'No assistant is set. Pick one in the catalog.';
      setError(message);
      announcer.announce(message);
      return;
    }
    if (!source.has(assistant, 'prompt')) {
      const message = `${assistantTitle ?? assistant} cannot answer prompts.`;
      setError(message);
      announcer.announce(message);
      return;
    }
    setValue('');
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      // The cart as it stands at send time, and then emptied: the attachments
      // belong to the message, the way a photo does. Leaving them would attach
      // them again to the next one.
      const attachments = cart.items();
      cart.clear();
      const handler = await source.module(assistant, 'prompt');
      await handler.handle(
        { text, terms: query.get('typing').pool, signal: controller.signal },
        { host: pluginHostFor(services, assistant), attachments },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The assistant failed.';
      setError(message);
      announcer.announce(message);
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setBusy(false);
      }
    }
  };

  // What plugins recommended for this text, ahead of name matches: a
  // plugin recognising its own data is a better answer than a plugin
  // whose description happens to share a word. Each row is a command
  // call the plugin filled in; pressing it does what typing it would.
  const offered = () =>
    query.get('typing').answers.flatMap((answer) =>
      answer.commands.map((call) => ({
        call,
        plugin: answer.plugin,
        command: qualifyCommand(call.command, answer.plugin),
      })),
    );
  const recommended = (text: string): BarSuggestion[] =>
    offered()
      .map(({ call, plugin, command }) => {
        const manifest = source.manifest(plugin);
        return {
          value: text,
          // The call says where you land; the plugin is who takes you.
          label: call.label,
          detail: manifest?.title,
          icon: iconFor(manifest?.icon, manifest?.color),
          run: () => void run(command, call.args),
        };
      })
      .slice(0, 4);

  // What the chosen intent suggested for this text: every plugin's commands
  // ranked by its declaration and by the sentence, arguments filled from the
  // identifiers the text carries, and the plugins' own offers in the order
  // the intent gave them. "dossier for P0AEX9" reaches Function Junction's
  // open with q filled whether or not that plugin recognised the text.
  const suggested = (text: string): BarSuggestion[] =>
    (query.get('typing').suggestions ?? []).slice(0, 4).map(({ call, detail }) => {
      const manifest = source.manifest(call.command.split(':')[0]);
      return {
        value: text,
        label: call.label,
        detail: detail ?? manifest?.title,
        icon: iconFor(manifest?.icon, manifest?.color),
        run: () => void run(call.command, call.args),
      };
    });

  // Row zero is what Enter will do. Nothing is guessed: the assistant
  // stays the default and the alternatives sit under it, visible before
  // the key is pressed rather than hidden behind knowing to press down.
  const defaultSuggestion = (text: string): BarSuggestion[] =>
    assistant
      ? [
          {
            value: text,
            // `Ask` only fits a question, and most of what is typed here is
            // an accession or a name. Send is what the row does, and the word
            // the composer's own button already uses.
            label: `Send to ${assistantTitle ?? assistant}`,
            icon: iconFor(source.manifest(assistant)?.icon, source.manifest(assistant)?.color),
            run: () => void submit(text),
          },
        ]
      : [];

  // Every term must appear somewhere in a plugin's name, id or
  // description; a name being typed outranks a description hit. Shared
  // by the app and panel rows below.
  const nameHits = (text: string, of: (m: Manifest) => boolean): Manifest[] => {
    const query = text.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    if (query.length < 2) return [];
    return source
      .manifests()
      .filter(of)
      .flatMap((m) => {
        const title = m.title.toLowerCase();
        const haystack = `${title} ${m.id} ${m.description?.toLowerCase() ?? ''}`;
        if (!terms.every((t) => haystack.includes(t))) return [];
        return [{ m, rank: title.startsWith(terms[0]) || m.id.startsWith(terms[0]) ? 0 : 1 }];
      })
      .sort((a, b) => a.rank - b.rank || a.m.title.localeCompare(b.m.title))
      .slice(0, 3)
      .map(({ m }) => m);
  };

  // The omnibox path to page-like plugins: "protein evidence" reaches
  // Function Junction without knowing it exists. A plugin is an app iff
  // its manifest has a launcher, and the row runs that launcher.
  const appSuggestions = (text: string): BarSuggestion[] =>
    nameHits(text, (m) => Boolean(m.launcher)).map((m) => ({
      value: text,
      label: `Open ${m.title}`,
      detail: m.description,
      icon: iconFor(m.icon, m.color),
      run: () => void run(qualifyCommand(m.launcher!.command, m.id), m.launcher!.args),
    }));

  // Panels are reached the way Home reaches them: a pinned navigator is
  // focused where it already lives, an unpinned one is previewed. The
  // bar never changes the layout to show you something.
  const panelSuggestions = (text: string): BarSuggestion[] =>
    nameHits(text, (m) => source.has(m.id, 'pane')).map((m) => {
      const pinned = layout.sidebar.pinned.includes(m.id);
      return {
        value: text,
        label: `Show ${m.title}`,
        detail: pinned ? 'In the sidebar' : m.description,
        icon: iconFor(m.icon, m.color),
        run: () => (pinned ? void openPane(services, m.id) : preview.set(m.id)),
      };
    });

  // The buttons plugins put on the Shortcuts block, reachable by name as
  // well. A shortcut is a call with its arguments filled in, so the row
  // always runs.
  const shortcutSuggestions = (text: string): BarSuggestion[] => {
    const query = text.trim().toLowerCase();
    if (query.length < 2) return [];
    return source
      .manifests()
      .flatMap((m) =>
        (m.shortcuts ?? []).map((call) => {
          const name = qualifyCommand(call.command, m.id);
          const declared = registry.get(name);
          return { m, call, name, declared };
        }),
      )
      .filter(({ call, declared }) =>
        `${call.label} ${declared?.title ?? ''} ${call.command}`.toLowerCase().includes(query),
      )
      .slice(0, 3)
      .map(({ m, call, name, declared }) => ({
        value: text,
        label: call.label,
        detail: declared?.title,
        icon: iconFor(m.commands?.find((c) => c.name === declared?.name)?.icon ?? m.icon, m.color),
        run: () => void run(name, call.args),
      }));
  };

  // Completion follows the text; a stale async result for older text is dropped.
  useEffect(() => {
    let live = true;
    // complete() answers [] for anything that is not a slash command.
    void complete(registry, value, ctx()).then((list) => {
      if (!live) return;
      // A command's icon is its plugin's; the workbench's own have none.
      const commands: BarSuggestion[] = list.map((s) => {
        const found = registry.find(s.value.trim().replace(/^\//, '').split(/\s+/)[0]);
        const manifest = found.ok ? source.manifest(found.command.source) : undefined;
        return {
          ...s,
          mono: true,
          icon: manifest ? iconFor(manifest.icon, manifest.color) : undefined,
        };
      });
      // Priority order, painted bottom-up: what the intent answered, which
      // already holds the plugins' offers in the order it judged; without
      // an intent, or with an empty answer, the offers as the plugins made
      // them; and where there is neither, a shortcut's name, then a word
      // shared with a description — the same search the Browse page runs,
      // inline. An offer is a plugin saying it recognises this text and what
      // it would do with it; the intent is what reads the rest of the
      // sentence.
      const suggestions = list.length ? [] : suggested(value);
      const offers = list.length || suggestions.length ? [] : recommended(value);
      const answers = suggestions.length ? suggestions : offers;
      const guesses =
        list.length || answers.length
          ? []
          : [...shortcutSuggestions(value), ...appSuggestions(value), ...panelSuggestions(value)];
      const alternatives = [...answers, ...guesses];
      // Nothing worth choosing between: no list, and Enter behaves as if
      // there were none. Browse is not appended as an escape: it is Home's
      // own command, ranked like any other when the text asks for it.
      const found = list.length
        ? commands
        : alternatives.length
          ? [...defaultSuggestion(value), ...alternatives]
          : [];
      setSuggestions(found);
      // Row zero is always the default action, so it is always selected;
      // arrowing away from it changes what Enter does, visibly.
      setHighlight(found.length ? 0 : -1);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ctx() reads the layout, which changes how commands filter but should not refetch on every layout change; queryVersion stands for the recommendations
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
  if (!assistant) {
    return (
      <p className={styles.promptContext}>
        Free text needs an assistant — pick one in the catalog.
      </p>
    );
  }
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
// Read from the prompt module's own store; it re-reads each time the plugin
// says it changed.
function AssistantContext({ assistant, prompt }: { assistant: string; prompt: Prompt }) {
  const context = useDestination(prompt.destination);
  const services = useServices();
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

// `current()` is read once per change the plugin reports, and the value is
// held until the next: a plugin builds the object afresh on every call,
// which React's store hook would otherwise take for an endless change.
function useDestination(destination: Prompt['destination']): Destination | null {
  const cache = useRef<{ of: typeof destination; value: Destination | null } | null>(null);
  const read = useCallback(() => {
    if (!cache.current || cache.current.of !== destination) {
      cache.current = { of: destination, value: destination?.current() ?? null };
    }
    return cache.current.value;
  }, [destination]);
  const subscribe = useCallback(
    (onChange: () => void) =>
      destination
        ? destination.subscribe(() => {
            cache.current = { of: destination, value: destination.current() };
            onChange();
          })
        : () => {},
    [destination],
  );
  return useSyncExternalStore(subscribe, read, read);
}
