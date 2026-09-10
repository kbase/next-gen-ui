# @kbase/plugin-sdk

What a next-gen-ui workbench plugin imports. The reference is the workbench's own
**Plugin developer documentation** page (`/plugin-docs` in a running workbench;
`src/workbench/host/docs/Docs.tsx` in this repo). This file says what the package is and how it
is built.

## Shape

A plugin is a service that serves a manifest and a bundle. The author writes `plugin.config.ts`
and up to six modules — `background`, `route`, `pane`, `commands`, `prompt`, `intent` — and names
the
modules in `vite.config.ts`:

```ts
import { pluginFederation } from '@kbase/plugin-sdk/vite';
import config from './plugin.config';

export default defineConfig({
  plugins: [
    pluginFederation({ config, route: './src/route.tsx', commands: './src/commands.ts' }),
    react(),
  ],
});
```

The build exposes each named file as a federation module and writes `manifest.json` beside
`remoteEntry.js`: the config plus `sdkVersion` and `modules`. The service serves
`manifest.json` and everything in `dist/` under `/services/<id>/` and `/services/<id>/plugin/`.

Each module default-exports one `define*` call: `defineBackground`, `defineRoute`, `definePane`,
`defineCommands`, `definePrompt`. `fromReact(Component)` turns a component into the `mount` a
route or pane needs; inside it, `usePanel`, `useHost`, `useCart`, `usePanelTitle`,
`usePanelBreadcrumbs`, `usePanelTerms` and `CartButton` read the handles the host provides.

## Three exports

- `.` — the runtime surface, imported by plugin code. Shares one instance with the host at
  runtime, so the handles' React contexts are the host's own.
- `./config` — the contract alone: `definePluginManifest` and the schemas. `plugin.config.ts`
  imports from here because the build loads it in Node, where the runtime entry's React and
  design-system imports cannot resolve.
- `./vite` — `pluginFederation`, the build preset. Imports `@module-federation/vite`, so it is
  kept off the runtime entry.

## Building it

`npm run build:plugin-sdk` in this repo writes `dist-plugin-sdk/` with both entries as JavaScript,
type declarations, and a `package.json`. A plugin in another checkout depends on that directory:

```json
"@kbase/plugin-sdk": "file:../../next-gen-ui/dist-plugin-sdk"
```

Built rather than consumed as source because `vite.config.ts` is loaded by Node, which cannot
import the preset out of TypeScript. `react`, `react-dom`, `zod`, `@phosphor-icons/react` and
`@kbase/design-system` are peers, external to the build, and shared singletons at runtime — the
same list `SHARED_SINGLETONS` gives the federation preset.
