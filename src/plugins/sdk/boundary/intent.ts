import { z } from 'zod';
import { CommandCallSchema, SlashCommandSchema } from './manifest';
import { OfferSchema } from './background';

// The keystroke crossing: what the host hands the chosen intent, and what it
// answers with. The host's half is the larger one — every command any
// manifest declares, and every term in view — which is why it is described
// here rather than left to a type: an intent is the module most likely to
// run somewhere else, and a sidecar has to be able to read what it is sent.

// Where a term reached the workbench from, strongest first: typed into the
// prompt bar, carried by the front tab, carried by an item in the cart. A
// term can arrive by more than one road; the first tier that holds it is the
// one it is weighed under. The set is closed because an intent weighs the
// tiers against each other, and a tier it has never heard of it cannot weigh.
export const CONTEXT_TIERS = ['typed', 'page', 'cart'] as const;
export const ContextTierSchema = z.enum(CONTEXT_TIERS);
export type ContextTier = z.infer<typeof ContextTierSchema>;

export const TieredTermsSchema = z.record(ContextTierSchema, z.array(z.string()));
export type TieredTerms = Record<ContextTier, string[]>;

// A command as its manifest declares it, with the plugin that declares it.
// Its arguments are holes: what fills them is what the user typed.
export const DeclaredCommandSchema = SlashCommandSchema.extend({
  plugin: z.string(),
  pluginTitle: z.string(),
});
export type DeclaredCommand = z.infer<typeof DeclaredCommandSchema>;

// A call a manifest has already filled in — a plugin's launcher, one of its
// shortcut buttons, or the workbench's own `show` for a plugin that has a
// sidebar pane. It runs as written, so nothing the user types fills anything
// in it; what the text decides is whether it is worth showing.
export const DeclaredCallSchema = CommandCallSchema.extend({
  // The manifest the call came from, whose mark the row wears. Not the
  // plugin that declares `command`: a pane's call runs the workbench's.
  plugin: z.string(),
  pluginTitle: z.string(),
  // The manifest's own description, where the call stands for the whole
  // plugin — a launcher or a pane. What a reader typing a plugin's name
  // rather than a command's is matching against.
  description: z.string().optional(),
});
export type DeclaredCall = z.infer<typeof DeclaredCallSchema>;

// What an intent is asked on the keystroke. Beside the text it carries
// everything the workbench has in view, tiered by where it came from. The
// signal is not in the schema: it aborts when the question changes, and what
// carries that to another process is that process's business.
export const IntentQuerySchema = z.object({
  text: z.string(),
  terms: TieredTermsSchema,
  // What the plugins offered for the typed text, each `command` qualified
  // and each carrying the term it answers.
  offers: z.array(OfferSchema),
});
export type IntentQuery = z.infer<typeof IntentQuerySchema> & { signal: AbortSignal };

// A row under the prompt bar.
export const SuggestionSchema = z.object({
  // `command` qualified as "plugin:name": the plugin suggesting is seldom
  // the one that declared it.
  call: CommandCallSchema,
  // Whose row it is, when that is not the plugin the command belongs to: a
  // pane row runs `workbench:show` and belongs to the plugin it shows. The
  // host draws the row with this plugin's icon and colour.
  plugin: z.string().optional(),
  // The row's caption, in place of the plugin's title: what the row does,
  // when the label is what it does it to.
  detail: z.string().optional(),
  // Higher is a closer match; rows are shown in the order returned.
  score: z.number(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;
