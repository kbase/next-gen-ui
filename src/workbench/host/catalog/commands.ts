import type { CommandHandler } from '../../../plugins/sdk';

// `/catalog`, and the Shortcuts button that runs it. Its own file because
// a component module may only export components.
export const commands: Record<string, CommandHandler> = {
  catalog: (_args, { host }) => host.openRoute('/'),
};
