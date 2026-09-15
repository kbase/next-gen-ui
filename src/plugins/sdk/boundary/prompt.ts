import { z } from 'zod';

// The assistant crossing: the message the host hands over, and where the
// plugin says the next one will land.

// What the assistant is asked to answer: the message, and the terms the
// backgrounds found in it. `text` holds something other than whitespace —
// the prompt bar's field and its Send button both refuse a blank box — and
// `terms` is the term pool as it stood at Enter. The signal, which aborts
// when the user sends another message or presses Stop, is not a value and is
// not described here.
export const QuerySchema = z.object({
  text: z.string(),
  terms: z.array(z.string()),
});
export type Query = z.infer<typeof QuerySchema> & { signal: AbortSignal };

// Where the next free-text message lands, shown above the prompt bar.
export const DestinationSchema = z.object({
  label: z.string(),
  // This plugin's route for it; the bar offers a jump there.
  path: z.string().optional(),
  // Other places it could land, and how the user picks one.
  options: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
  // A callback, so a destination that crossed a process boundary would carry
  // the key back some other way. It is checked for being callable and no
  // more, and it has no place in the JSON shape of a destination.
  select: z.custom<(key: string) => void>((v) => typeof v === 'function').optional(),
});
export type Destination = z.infer<typeof DestinationSchema>;
