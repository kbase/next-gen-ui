import { definePluginManifest } from '@kbase/plugin-sdk/config';

export default definePluginManifest({
  id: 'koros',
  title: 'KOROS',
  description:
    'The co-scientist: ask a question, approve its plan, steer the arc to a deliverable.',
  icon: 'ChatCircleDots',
  color: 'blue',
  commands: [{ name: 'new-question', title: 'New question', icon: 'ChatCirclePlus' }],
  shortcuts: [{ label: 'New question', command: 'new-question' }],
});
