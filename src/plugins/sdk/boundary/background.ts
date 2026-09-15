import { z } from 'zod';
import { CommandCallSchema } from './manifest';

// What a background is asked and what it answers with. The questions are the
// host's and carry an `AbortSignal`, which no schema describes: a signal is a
// live object rather than a value, and a question that leaves this process
// carries cancellation its own way.

// The text as it stands in the prompt bar. `terms` reads it and nothing
// else, so there is no signal: the answer is due before the next keystroke.
export const TypedTextSchema = z.object({
  text: z.string(),
});
export type TypedText = z.infer<typeof TypedTextSchema>;

// The text and every term the backgrounds found in it. The signal aborts on
// the next keystroke.
export const TypedQuerySchema = TypedTextSchema.extend({
  terms: z.array(z.string()),
});
export type TypedQuery = z.infer<typeof TypedQuerySchema> & { signal: AbortSignal };

// The terms an open page or the cart carries. The signal aborts when they
// change again.
export const TermsQuerySchema = z.object({
  terms: z.array(z.string()),
});
export type TermsQuery = z.infer<typeof TermsQuerySchema> & { signal: AbortSignal };

// What `terms()` answers with: namespaced keys another plugin might
// recognise, found in the text by shape alone.
export const TermsSchema = z.array(z.string().min(1));

// How a plugin came to offer a command for a term:
// `record` — it holds the thing the term names and read this offer out of
//   its own inventory, so the thing exists and the command will find it;
// `identifier` — the term is an id in a namespace this plugin serves,
//   recognised by shape and not looked up, so it may name nothing;
// `name` — words matched words: a label the plugin knows, or a description
//   that says it takes this kind of thing. The weakest of the three, since
//   ordinary sentences are made of words.
export const MatchKindSchema = z.enum(['record', 'identifier', 'name']);
export type MatchKind = z.infer<typeof MatchKindSchema>;

// Why a command is offered. No score: one plugin's 0.8 says nothing beside
// another's, and ordering is the intent's job — what the intent cannot work
// out for itself is what the plugin matched and how.
//
// The tier is not here. `offer` is asked about typed text and nothing else,
// so a plugin could only ever write `typed`; the intent takes the tier from
// the query it sent, which also makes a term the query never carried
// evidence of nothing.
export const MatchSchema = z.object({
  // The term this offer answers, as it appeared in the query.
  term: z.string().min(1),
  kind: MatchKindSchema,
});
export type Match = z.infer<typeof MatchSchema>;

// A command a plugin volunteered for what was typed, with what it matched.
export const OfferSchema = CommandCallSchema.extend({ match: MatchSchema });
export type Offer = z.infer<typeof OfferSchema>;
