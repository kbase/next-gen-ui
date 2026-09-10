import { definePluginManifest } from '@kbase/plugin-sdk/config';

export default definePluginManifest({
  id: 'intent',
  title: 'Intent',
  description: "Recognises identifiers in typed text and ranks every plugin's commands against it.",
  icon: 'Lightning',
  color: 'green',
});
