import { defineCommands } from '@kbase/plugin-sdk';
import { koros } from './store';

export default defineCommands({
  // KIND*AI's + New question: a new arc, its page open, the prompt bar on it.
  'new-question': async (_args, { host }) => {
    const arc = koros.newArc();
    host.openRoute(`/${arc.slug}`);
    if (host.hasCommand('workbench:prompt')) await host.execute('workbench:prompt');
  },
});
