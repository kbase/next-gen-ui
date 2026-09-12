import type { CartItem } from './cart';
import type { CommandCall, SlashCommand } from './contract';
import type { PluginHost } from './host';
import type { PanelHandle } from './panel';

// The six modules a plugin can expose, in the order the host reaches them.
// Each `define*` is identity at runtime: it exists so the file's default
// export is typed, and so a plugin that omits a required field — a route
// without `normalize` — fails to compile rather than to run.

export type Cleanup = () => void;

// A panel's body. Called once, when the panel is first shown, with the
// element to draw into; the return is called when the panel goes away.
// `fromReact` builds one from a component.
export type Mount = (
  el: HTMLElement,
  ctx: { panel: PanelHandle; host: PluginHost },
) => Cleanup | void;

export interface Route {
  mount: Mount;
  // Two paths are the same page when this maps them to one string. The host
  // opens and deduplicates on what it returns, and never reads a path itself.
  normalize: (path: string) => string;
}

export interface Pane {
  mount: Mount;
  // `content`: the sidebar block hugs its content instead of taking a share
  // of the stack's height — for toolbars and status panels.
  fit?: 'content';
}

// What the host asks about: typed text, or a pool of terms from panels and
// the cart. The signal aborts when the question changes.
export interface Query {
  text?: string;
  terms?: string[];
  // For an intent: what plugins offered for the terms so far, each
  // `command` qualified. The intent orders these with its own candidates.
  offers?: CommandCall[];
  signal: AbortSignal;
}

// The text as it stands in the prompt bar. `terms` reads it and nothing
// else, so there is no signal: the answer is due before the next keystroke.
export interface TypedText {
  text: string;
}

// The text and every term the backgrounds found in it. The signal aborts on
// the next keystroke.
export interface TypedQuery extends TypedText {
  terms: string[];
  signal: AbortSignal;
}

// The terms an open page or the cart carries. The signal aborts when they
// change again.
export interface TermsQuery {
  terms: string[];
  signal: AbortSignal;
}

export interface StatusItem {
  text: string;
  // Run when the line is pressed.
  action?: CommandCall;
}

// The two questions a background answers are asked on different clocks and
// answered with different things, so each is its own member.
//
// `offer` answers "what do I do with this?" — the user is typing, the answer
// is an action, and it lives as long as the text does. `relate` answers
// "what else is there about this?" — a page is open or the cart has
// something in it, and the answer is a thing: identifiable, describable,
// carrying terms of its own that the other plugins are then asked about.
export interface Background {
  // Every keystroke, with the text as typed. Synchronous, no I/O: recognise
  // the shape of the text and nothing more.
  terms?: (q: TypedText) => string[];
  // What this plugin would do with the text, on every keystroke: answer from
  // the terms alone, without I/O. The prompt bar shows these, and the chosen
  // intent orders them with its own candidates. A lookup belongs in
  // `relate`.
  offer?: (q: TypedQuery) => CommandCall[] | Promise<CommandCall[]>;
  // What this plugin has about the terms an open page or the cart carries,
  // 250 ms after they change; never for typed text. May fetch. The items are
  // shown in Related, where the user opens one or adds it to the cart.
  relate?: (q: TermsQuery) => CartItem[] | Promise<CartItem[]>;
  // At startup and after every command; shown until the next call.
  status?: () => StatusItem[];
}

// What a command handler runs against. `caller` is the plugin that called
// `execute`, or 'user' for the prompt bar and every button.
export interface CommandContext {
  host: PluginHost;
  caller: string;
}

export type CommandHandler = (
  args: Record<string, string>,
  ctx: CommandContext,
) => void | Promise<void>;

export type Commands = Record<string, CommandHandler>;

// Where the next free-text message lands, shown above the prompt bar.
export interface Destination {
  label: string;
  // This plugin's route for it; the bar offers a jump there.
  path?: string;
  // Other places it could land, and how the user picks one.
  options?: { key: string; label: string }[];
  select?: (key: string) => void;
}

export interface Prompt {
  // Free text the prompt bar did not resolve to a command or a suggestion,
  // with the term pool and the cart as it stood when Enter was pressed.
  handle: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>;
  // Start a new conversation: every assistant has one to start, so the
  // prompt bar offers it itself, ahead of the destinations the plugin lists.
  // Opens the plugin's page for it, and the next message lands there.
  newConversation: (ctx: { host: PluginHost }) => void | Promise<void>;
  destination?: {
    // What the bar shows; read whenever it redraws.
    current: () => Destination | null;
    // Call `onChange` when `current()` would differ; the function returned
    // stops the calls.
    subscribe: (onChange: () => void) => () => void;
  };
}

// A command as its manifest declares it, with the plugin that declares it.
export type DeclaredCommand = SlashCommand & { plugin: string; pluginTitle: string };

export interface Suggestion {
  // `command` qualified as "plugin:name": the plugin suggesting is seldom
  // the one that declared it.
  call: CommandCall;
  // The row's caption, in place of the plugin's title: what the row does,
  // when the label is what it does it to.
  detail?: string;
  // Higher is a closer match; rows are shown in the order returned.
  score: number;
}

// What turns typed text into command suggestions. One plugin's intent
// module is chosen in Settings, the way the assistant is; the workbench
// itself reads no text.
export interface Intent {
  // Once when the module arrives, with every installed plugin's commands,
  // so that no keystroke has to see the catalog.
  index: (commands: DeclaredCommand[]) => void;
  // Every keystroke, with the text, the terms every background found in it,
  // and the commands plugins offered for those terms. The answer is the
  // whole list, offers included in whatever order and number the intent
  // judges; the host shows the offers as they are only when there is no
  // answer. Sync or async; what arrives is shown, and an answer to text that
  // has since changed is dropped by the signal.
  suggest: (q: Query) => Suggestion[] | Promise<Suggestion[]>;
}

export interface Modules {
  background: Background;
  route: Route;
  pane: Pane;
  commands: Commands;
  prompt: Prompt;
  intent: Intent;
}

export const defineBackground = (b: Background): Background => b;
export const defineRoute = (r: Route): Route => r;
export const definePane = (p: Pane): Pane => p;
export const defineCommands = (c: Commands): Commands => c;
export const definePrompt = (p: Prompt): Prompt => p;
export const defineIntent = (i: Intent): Intent => i;
