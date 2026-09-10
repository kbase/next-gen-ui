import { definePluginManifest } from '@kbase/plugin-sdk/config';

export default definePluginManifest({
  id: 'jobs',
  title: 'Jobs',
  description: 'Background work: queued, running and finished jobs.',
  icon: 'ListChecks',
  color: 'orange',
  commands: [
    {
      name: 'open',
      title: 'Open a job',
      args: [{ name: 'id', required: true, description: 'job id' }],
      semantics: {
        description:
          'Open, show, check or view the status, progress, log or result of a background job or running task.',
        examples: ['status of job 12', 'how is job 12 doing', 'show the log for job 12'],
      },
    },
    {
      name: 'cancel',
      title: 'Cancel a job',
      args: [{ name: 'id', required: true, description: 'job id' }],
      semantics: {
        description: 'Cancel, stop, kill or abort a running or queued background job or task.',
        examples: ['cancel job 12', 'stop job 12', 'kill the running job'],
      },
    },
  ],
});
