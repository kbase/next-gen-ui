import { z } from 'zod';

// What a plugin says to the reader through the host.

// A toast, for the outcome only the plugin can see: a command that ran and
// changed nothing visible, a neighbour that is not installed.
export const NoticeSchema = z.string().min(1);
