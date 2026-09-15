import { z } from 'zod';

// Running a command: what fills its arguments, and who asked. A plugin calls
// `host.execute` with these, and the host hands the same two to whichever
// plugin declares the command.

// Every argument is a string. What the user typed is a string, and a command
// that wants a number parses it where it knows what the number means.
export const ArgValuesSchema = z.record(z.string(), z.string());
export type ArgValues = z.infer<typeof ArgValuesSchema>;

// The plugin that called `execute`, or 'user' for the prompt bar and every
// button. A handler reads it to tell a keystroke from a neighbour acting for
// someone, so a destructive command can refuse the second.
export const CallerSchema = z.string().min(1);
export type Caller = z.infer<typeof CallerSchema>;
