import { defineCommands } from '@kbase/plugin-sdk';

export default defineCommands({
  open: ({ ref }, { host }) => host.openRoute(`/${String(ref)}`),
});
