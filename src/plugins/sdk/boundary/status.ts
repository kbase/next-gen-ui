import { z } from 'zod';
import { CommandCallSchema } from './manifest';

// A plugin's line in the status bar, pushed when it changes rather than
// asked for on a clock of the host's.
export const StatusItemSchema = z.object({
  text: z.string(),
  // Run when the line is pressed.
  action: CommandCallSchema.optional(),
});
export type StatusItem = z.infer<typeof StatusItemSchema>;
