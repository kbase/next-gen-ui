import type { CommandHandler } from '../../../plugins/sdk';

// `/settings`, and the Shortcuts button that runs it. Its own file because
// a component module may only export components.
export const commands: Record<string, CommandHandler> = {
  settings: (_args, { host }) => host.openRoute('/'),
};
