import type { CommandHandler } from '@kbase/plugin-sdk';

// `/plugin-docs`. Its own file because a component module may only export
// components.
export const commands: Record<string, CommandHandler> = {
  'plugin-docs': (_args, { host }) => host.openRoute('/'),
};
