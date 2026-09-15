import type { CartItem } from './boundary/cart';
import type { Offer, TermsQuery, TypedQuery, TypedText } from './boundary/background';
import type { Destination, Query } from './boundary/prompt';
import type { StatusItem } from './boundary/status';
import type { DeclaredCall, DeclaredCommand, IntentQuery, Suggestion } from './boundary/intent';
import type { ArgValues, Caller } from './boundary/commands';
import type { PluginHost } from './host';
import type { PanelHandle } from './panel';

export {
  StatusItemSchema,
  DestinationSchema,
  SuggestionSchema,
  QuerySchema,
  IntentQuerySchema,
  TypedTextSchema,
  TypedQuerySchema,
  TermsQuerySchema,
  TermsSchema,
  DeclaredCommandSchema,
  DeclaredCallSchema,
  ArgValuesSchema,
  CallerSchema,
} from './boundary';
export type {
  StatusItem,
  Destination,
  Suggestion,
  Query,
  IntentQuery,
  TypedText,
  TypedQuery,
  TermsQuery,
  DeclaredCommand,
  DeclaredCall,
  ArgValues,
  Caller,
} from './boundary';

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
  caller: Caller;
}

export type CommandHandler = (args: ArgValues, ctx: CommandContext) => void | Promise<void>;

export type Commands = Record<string, CommandHandler>;

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
