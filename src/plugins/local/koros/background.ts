import { defineBackground } from '@kbase/plugin-sdk';
import { koros } from './store';

export default defineBackground({
  // Pushed from the store's own notification: an arc reaching a gate or
  // finishing a turn is what changes these counts.
  status: (set) => {
    const push = () => {
      const you = koros.needingYou();
      const working = koros.working();
      set([
        ...(you > 0 ? [{ text: `${you} need${you === 1 ? 's' : ''} you` }] : []),
        ...(working > 0 ? [{ text: `${working} working` }] : []),
      ]);
    };
    push();
    return koros.subscribe(push);
  },
});
