import { definePluginManifest } from '@kbase/plugin-sdk/config';

export default definePluginManifest({
  id: 'data',
  title: 'Data',
  description: 'The Data home: datasets by provenance, including the KBase 1.0 bridge.',
  icon: 'Database',
  color: 'teal',
  commands: [
    {
      name: 'open',
      title: 'Open a dataset',
      args: [{ name: 'ref', required: true, description: 'dataset ref or workspace UPA' }],
      semantics: {
        description:
          'Open, view, show or look at a dataset, workspace object, genome, assembly, reads or narrative data by its reference.',
        examples: ['open 12345/6/7', 'show me the dataset 4/12/3', 'look at this object'],
      },
    },
  ],
});
