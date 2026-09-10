import { defineBackground } from '@kbase/plugin-sdk';
import { koros } from './store';

export default defineBackground({
  status: () => {
    const you = koros.needingYou();
    const working = koros.working();
    return [
      ...(you > 0 ? [{ text: `${you} need${you === 1 ? 's' : ''} you` }] : []),
      ...(working > 0 ? [{ text: `${working} working` }] : []),
    ];
  },
});
