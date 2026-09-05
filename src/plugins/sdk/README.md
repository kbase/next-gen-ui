# @kbase/plugin-sdk

What a next-gen-ui workbench plugin imports. A plugin is two things: a **manifest** the registry
serves (read by the host before any code loads) and a **module** the host loads on first use.

## Manifest

```json
{
  "id": "jobs",
  "title": "Jobs",
  "contractVersion": 1,
  "icon": "ListChecks",
  "navigator": {},
  "document": { "route": "/job/$id" },
  "commands": [
    {
      "name": "cancel",
      "title": "Cancel a job",
      "args": [{ "name": "id", "type": "string", "required": true }]
    },
    { "name": "new-thing", "title": "Make a thing", "icon": "Lightning", "shortcut": "New thing" }
  ],
  "promptHandler": false,
  "entry": { "url": "jobs/remoteEntry.js", "module": "./plugin", "matcher": "./match" }
}
```

`ManifestSchema` validates it. Ids are `^[a-z][a-z0-9-]{1,40}$` and never change once published.
`document.route` uses `$name` segments; those names are the document's params and its identity.
A command with `shortcut` (true, or a short button label) appears in the sidebar shortcut
toolbar, with `icon` from the host's icon table (absent, the plugin's own icon); it should
not require arguments the user must type.

## Module

```tsx
import { definePlugin, usePanel, usePanelTitle, useHost } from '@kbase/plugin-sdk';

function Navigator() {
  usePanelTitle('Jobs');
  const host = useHost();
  return <button onClick={() => host.openDocument({ id: '12' })}>Job 12</button>;
}

function Document() {
  const { params } = usePanel();
  usePanelTitle(`Job ${params.id}`);
  return <p>{params.id}</p>;
}

export default definePlugin({
  navigator: Navigator,
  document: Document,
  commands: {
    cancel: ({ id }, host) => {
      /* … */
    },
  },
  useStatus: () => [{ text: '1 running' }],
});
```

- One `navigator` component and one `document` component at most; both read `usePanel()` for
  their id, params, focus state and `setTitle`. A panel shows the plugin title until it sets one.
- `commands` implement what the manifest declared; the host validates arguments before calling.
- `prompt(request, host)` makes the plugin an assistant candidate (`promptHandler: true`).
- `useStatus` is a hook returning `{ text, command? }` items for the status bar; called once the
  module has loaded.
- `usePromptContext` is a hook naming where free text will land (the open conversation, or what
  submitting would create): `{ label, documentParams?, options?, select? }`. Shown above the
  prompt bar once the module has loaded; `options` + `select` let the user switch the destination
  before sending, `documentParams` lets them jump to its document.
- `AppFrame` renders an iframe that survives its panel being moved between groups.
- `usePanelBreadcrumbs(crumbs)` declares where the panel sits: `{ label, action? }` per step, in
  the plugin's own words. The host draws the row above the panel and borrows from the trail when
  two tabs in a group share a title. Declaring none is normal and costs nothing.
- A `Matcher` — `match(text) => Offer[]` — volunteers the plugin for what the user is typing.
  Each `Offer` names a destination in the plugin's own words (`label`: "Protein dossier for
  P0A7B8") and the `action` that gets there. The host only carries the action: it becomes the
  document's params, which the plugin reads back through `usePanel()`. One input may offer
  several actions, since one accession is worth landing on in more than one place.
  It runs on every keystroke, so it is synchronous and cheap, with no I/O; `[]` is the normal
  answer. Params it returns are the document's identity, so any the route has no segment for
  travel in the URL's query string.

## Building a remote

```ts
// vite.config.ts
import { pluginFederation } from '@kbase/plugin-sdk/vite';
export default {
  plugins: [pluginFederation({ name: 'jobs', matcher: './src/match.ts' }), react()],
};
```

Emits `remoteEntry.js` exposing `./plugin`, and `./match` when a matcher is named. `react`,
`react-dom`, `zod`, `@kbase/design-system` and this SDK are shared singletons with the host.

The matcher is a separate module because the host fetches it at startup while the UI module stays
lazy: matching is synchronous on every keystroke, so it cannot wait for a panel bundle. Keep that
module small and free of imports — it is downloaded whether or not the plugin is ever opened. A
matcher that fails to load makes no offers and is otherwise ignored, like one that throws.
