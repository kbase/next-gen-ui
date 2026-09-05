import type { PluginHost } from '../../../plugins/sdk';

// `/browse`, and the Shortcuts button that runs it: opening Home is the
// whole command, so the host's own plugin implements it like any other.
// Its own file because a component module may only export components.
export const commands = {
  browse: (_values: unknown, host: PluginHost) => host.openDocument({}),
};
