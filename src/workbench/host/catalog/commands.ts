import type { PluginHost } from '../../../plugins/sdk';

// `/catalog`, and the Shortcuts button that runs it. Its own file because
// a component module may only export components.
export const commands = {
  catalog: (_values: unknown, host: PluginHost) => host.openDocument({}),
};
