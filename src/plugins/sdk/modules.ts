import type { CartItem } from './cart';
import type { CommandCall, Offer, SlashCommand, TieredTerms } from './contract';
import type { PluginHost } from './host';
import type { PanelHandle } from './panel';

// The six modules a plugin can expose, in the order the host reaches them.
// Each `define*` is identity at runtime: it exists so the file's default
// export is typed, and so a plugin that omits a required field — a route
// without `normalize` — fails to compile rather than to run.

export type Cleanup = () => void;

// A value the plugin pushes to the host. `subscribe(set)` calls `set` with
// the value as it stands before it returns, and calls it again on every
// change; what the host shows is the last value it was handed, so the
// plugin's own call is the change detection and the host never asks. The
// returned function stops whatever produces the pushes — a timer, a
// listener, an open request — and no `set` after it runs is read.
export type Subscribe<T> = (set: (value: T) => void) => Cleanup;

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

// What the assistant is asked to answer: the message, and the terms the
// backgrounds found in it. The signal aborts when the user sends another
// message or presses Stop.
export interface Query {
  text?: string;
  terms?: string[];
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
  // intent orders them with its own candidates. Each offer names the term it
  // answers and how it matched it, which is what the intent cannot work out
  // for itself. A lookup belongs in `relate`.
  offer?: (q: TypedQuery) => Offer[] | Promise<Offer[]>;
  // What this plugin has about the terms an open page or the cart carries,
  // 250 ms after they change; never for typed text. May fetch. The items are
  // shown in Related, where the user opens one or adds it to the cart.
  relate?: (q: TermsQuery) => CartItem[] | Promise<CartItem[]>;
  // The plugin's lines for the status bar: `set` them when the host
  // subscribes, and again whenever they change. A line that waits on a
  // server is pushed when it lands, not on a clock of the host's.
  status?: Subscribe<StatusItem[]>;
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
  // Where the bar says the next message goes: `set` it when the bar
  // subscribes, and again whenever it moves. `null` is no destination, and
  // the bar shows New conversation.
  destination?: Subscribe<Destination | null>;
}

// A command as its manifest declares it, with the plugin that declares it.
// Its arguments are holes: what fills them is what the user typed.
export type DeclaredCommand = SlashCommand & { plugin: string; pluginTitle: string };

// A call a manifest has already filled in — a plugin's launcher, one of its
// shortcut buttons, or the workbench's own `open` for a plugin that has a
// sidebar pane. It runs as written, so nothing the user types fills anything
// in it; what the text decides is whether it is worth showing. The command it
// names is declared somewhere, by this plugin, another, or the workbench.
export interface DeclaredCall extends CommandCall {
  // The manifest the call came from, whose mark the row wears. Not the
  // plugin that declares `command`: a pane's call runs the workbench's.
  plugin: string;
  pluginTitle: string;
  // The manifest's own description, where the call stands for the whole
  // plugin — a launcher or a pane. What a reader typing a plugin's name
  // rather than a command's is matching against.
  description?: string;
}

export interface Suggestion {
  // `command` qualified as "plugin:name": the plugin suggesting is seldom
  // the one that declared it.
  call: CommandCall;
  // Whose row it is, when that is not the plugin the command belongs to: a
  // pane row runs `workbench:open` and belongs to the plugin it shows. The
  // host draws the row with this plugin's icon and colour.
  plugin?: string;
  // The row's caption, in place of the plugin's title: what the row does,
  // when the label is what it does it to.
  detail?: string;
  // Higher is a closer match; rows are shown in the order returned.
  score: number;
}

// What an intent is asked on the keystroke. Beside the text it carries
// everything the workbench has in view, tiered by where it came from: the
// terms the backgrounds found in the text, the front tab's terms, and the
// cart's. No plugin is asked about `page` or `cart` on a keystroke — the
// intent is the one module that sees them while the user types, and it
// already ranks every command any manifest declares, so it can reach a
// command for a term the user merely has around without five plugins being
// asked a bigger question on every keystroke.
export interface IntentQuery {
  text: string;
  terms: TieredTerms;
  // What the plugins offered for the typed text, each `command` qualified
  // and each carrying the term it answers.
  offers: Offer[];
  signal: AbortSignal;
}

// What turns typed text into the rows under the prompt bar. One plugin's
// intent module is chosen in Settings, the way the assistant is; the
// workbench itself reads no text, and every row it draws for free text comes
// from here.
export interface Intent {
  // Once when the module arrives, with everything the workbench can be asked
  // to do, so that no keystroke has to see the catalog: every plugin's
  // declared commands, and every call the manifests already filled in.
  index: (commands: DeclaredCommand[], calls: DeclaredCall[]) => void;
  // Every keystroke, and again when a slow plugin's offer lands or the page
  // or cart changes under text already typed. The answer is the whole list,
  // offers included in whatever order and number the intent judges; the host
  // shows the offers as they are only when there is no answer. Sync or
  // async; what arrives is shown, and an answer to a question that has since
  // changed is dropped by the signal.
  suggest: (q: IntentQuery) => Suggestion[] | Promise<Suggestion[]>;
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
