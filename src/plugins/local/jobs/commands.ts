import { defineCommands } from '@kbase/plugin-sdk';
import { jobStore } from './store';

export default defineCommands({
  open: ({ id }, { host }) => host.openRoute(`/${String(id)}`),
  cancel: ({ id }) => {
    if (!jobStore.cancel(String(id))) throw new Error(`job ${String(id)} cannot be cancelled`);
  },
});
