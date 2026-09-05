import type { ComponentType } from 'react';
import type { PluginHost } from './host';

// The module a plugin's entry exports: the code side of the manifest. The
// host checks each manifest declaration against the module it loads and
// reports (not throws) on a mismatch.

export interface StatusItem {
  text: string;
  // A slash command name to run when the item is activated.
  command?: string;
}

export type CommandValues = Record<string, string | number>;

export interface PromptRequest {
  text: string;
  signal: AbortSignal;
}

// The assistant. Free text from the prompt bar arrives here; the handler
// drives its own UI through the host (opening or updating its document).
export type PromptHandler = (request: PromptRequest, host: PluginHost) => Promise<void>;

// A destination the assistant could send free text to.
export interface PromptDestinationOption {
  key: string;
  label: string;
}

// Where the next free-text prompt will land: the open conversation, or
// what submitting would create ("A new arc"). Only the assistant knows
// this; the host shows it above the prompt bar. With `options` and
// `select` the host offers switching the destination before sending;
// with `documentParams` it offers opening the destination's document.
export interface PromptContext {
  label: string;
  documentParams?: Record<string, string>;
  options?: PromptDestinationOption[];
  select?: (key: string) => void;
}

// Something a plugin offers to do with what the user typed.
export interface Offer {
  // Where this lands you, in the plugin's words — "Protein dossier for
  // P0A7B8", not "UniProt accession". What was recognised is the
  // plugin's reasoning; what happens is the user's question.
  label: string;
  // What the plugin is being asked to do. Opaque to the host, which only
  // carries it: it becomes the document's params, and the plugin reads
  // it back through usePanel(). One input may offer several actions.
  action: Record<string, string>;
}

// Plugins volunteer: only the plugin knows what "mine" looks like, so the
// host runs this rather than interpreting the query itself. Called on
// every keystroke, so it is synchronous and cheap — no I/O, no await.
// Returning [] is the normal answer.
export type Matcher = (text: string) => Offer[];

export interface PluginModule {
  navigator?: ComponentType;
  document?: ComponentType;
  commands?: Record<string, (values: CommandValues, host: PluginHost) => void | Promise<void>>;
  prompt?: PromptHandler;
  // A hook, so counts can be live. Called by the host once the module has
  // loaded, which happens when a panel renders or a command runs.
  useStatus?: () => StatusItem[];
  // A hook naming where free text will land (see PromptContext). Called
  // once the module has loaded; until then the bar names only the plugin.
  usePromptContext?: () => PromptContext | null;
}

export function definePlugin(module: PluginModule): PluginModule {
  return module;
}
