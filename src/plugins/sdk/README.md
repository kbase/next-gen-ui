# @kbase/plugin-sdk

What a next-gen-ui workbench plugin imports. The reference is the workbench's own
**Plugin developer documentation** page (`/plugin-docs` in a running workbench;
`src/workbench/react/pages/docs/Docs.tsx` in this repo). This file says what the package is and how it
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
`defineCommands`, `definePrompt`, `defineIntent`. `fromReact(Component)` turns a component into
the `mount` a route or pane needs; inside it, `usePanel`, `useHost`, `useCart`, `usePanelTitle`,
`usePanelBreadcrumbs`, `usePanelTerms` and `CartButton` read the handles the host provides.

## Four exports

- `.` — the runtime surface, imported by plugin code. Shares one instance with the host at
  runtime, so the handles' React contexts are the host's own.
- `./config` — the contract alone: `definePluginManifest` and the schemas. `plugin.config.ts`
  imports from here because the build loads it in Node, where the runtime entry's React and
  design-system imports cannot resolve.
- `./vite` — `pluginFederation`, the build preset. Imports `@module-federation/vite`, so it is
  kept off the runtime entry.
- `./boundary` — every value that crosses between a plugin and the host, as a zod schema with its
  type inferred from it. Reachable from `.` as well; it is its own entry because it reaches
  nothing but zod, so the build can import it in Node to write the schemas out.

## The boundary as JSON Schema

`dist-plugin-sdk/schemas/` holds one JSON Schema per value that crosses, `<Name>.json`, listed in
`index.json` by the direction it travels. They are written from the same schema objects the host
parses with, so they cannot drift from it.

A plugin whose half is written in another language validates against them in its own test suite:

```python
SCHEMAS = Path("web/node_modules/@kbase/plugin-sdk/schemas")
jsonschema.validate(card_item(ctx, snap), json.loads((SCHEMAS / "CartItem.json").read_text()))
```

That test fails when the plugin's pinned workbench ref moves past a change to the shape, which is
where a Python-built cart item would otherwise reach the host as a cast nothing checks.

## Building it

`npm run build:plugin-sdk` in this repo writes `dist-plugin-sdk/` with all three entries as
JavaScript, type declarations, and a `package.json`. A plugin in another checkout depends on that
directory:

```json
"@kbase/plugin-sdk": "file:../../next-gen-ui/dist-plugin-sdk"
```

Built rather than consumed as source because `vite.config.ts` is loaded by Node, which cannot
import the preset out of TypeScript. `react`, `react-dom`, `zod`, `@phosphor-icons/react` and
`@kbase/design-system` are peers, external to the build, and shared singletons at runtime.
`SHARED_SINGLETONS` also names `@tanstack/react-router` and this SDK itself as runtime
singletons. The preset takes every one of them from the workbench and bundles no copy of any,
whether or not the plugin lists it as a dependency — a remote built this way runs only inside a
workbench, so a fallback copy would be dead weight and a second React would break every hook.
