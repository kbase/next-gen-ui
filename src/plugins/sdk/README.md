# @kbase/plugin-sdk

What a workbench plugin is built against. A plugin is a separate Vite project that ships from its
own server on its own schedule; the workbench fetches its code while it runs and renders it in the
page. This package is the two halves of that arrangement — what the plugin's own code imports, and
the Vite preset that makes its build produce something the workbench can fetch.

**How to write a plugin is the workbench's Plugin developer documentation page** — `/plugin-docs` in
a running workbench, `src/workbench/react/pages/docs/Docs.tsx` in this repo. That page is the
contract: `Docs.contract.test.ts` compares every signature on it against this package and fails when
the two disagree. This file is what the page does not cover: how the package is built and depended
on.

## Four entry points, used at three different times

- `.` — imported by the plugin's own code: the `define*` helpers, `fromReact`, the panel and host
  hooks, `CartButton`. Shared with the workbench at runtime, so the contexts behind those hooks are
  one set of objects across the boundary rather than two.
- `./boundary` — every value that crosses between a plugin and the host, as a zod schema with its
  type inferred from it. Reachable from `.` as well; its own entry because it reaches nothing but
  zod and the package version, so the build can import it in Node to write the schemas out.
- `./config` — the contract alone. `plugin.config.ts` imports it, and the plugin's build loads that
  file to write the manifest, so it must not drag React or the design system in behind it.
- `./vite` — `pluginFederation`, imported by `vite.config.ts`.

## What the preset does

`pluginFederation({ config, route: './src/route.tsx', … })` exposes each module the config names as
its own federation entry, and writes `manifest.json` beside `remoteEntry.js`. Separate entries are
the point: the workbench reads the manifest at startup, fetches `background` and `intent` then, and
fetches `route` only when a tab of that plugin opens. A file the config does not name is not part of
the plugin, whatever it exports.

`react`, `react-dom`, `zod`, `@phosphor-icons/react`, `@kbase/design-system`,
`@tanstack/react-router` and this SDK are marked shared with `import: false`, so the plugin's bundle
carries no copy of any of them and each resolves through the share scope the workbench set up.
Nothing else would work: a second copy of React gives the plugin its own hook dispatcher, and a
second copy of the SDK gives it its own `PanelContext`, which the host's provider would never reach.

## Depending on it

`npm run build:plugin-sdk` writes `dist-plugin-sdk/` — the four entries as JavaScript, their type
declarations, the JSON Schemas, and a generated `package.json`. An `sdk-vX.Y.Z` release runs that
build and attaches the packed result to the release (`.github/workflows/plugin-sdk.yml`), and a
plugin installs it from there, beside the design system's own release build:

```
npm i https://github.com/kbase/next-gen-ui/releases/download/sdk-v0.5.0/kbase-plugin-sdk-0.5.0.tgz
npm i https://github.com/kbase/next-gen-ui/releases/download/ds-v0.9.4/kbase-design-system-0.9.4.tgz
```

A tarball install copies the package into `node_modules` and installs its peers, so the type
declarations resolve as they would for any published package. Built rather than consumed as source
because a plugin lives in a different repository: it needs something npm can resolve, carrying the
entry points, the type declarations and the peer dependencies that a source directory does not have.

## Pinning the boundary from another language

`dist-plugin-sdk/schemas/` holds one JSON Schema per value that crosses, `<Name>.json`, listed in
`index.json` by the direction it travels. They are written from the same schema objects the host
parses with, so they cannot drift from it.

A plugin whose other half is written outside TypeScript validates against them in its own test
suite:

```python
SCHEMAS = Path("web/node_modules/@kbase/plugin-sdk/schemas")
jsonschema.validate(card_item(ctx, snap), json.loads((SCHEMAS / "CartItem.json").read_text()))
```

That test fails when the plugin's pinned workbench ref moves past a change to the shape, which is
where a Python-built cart item would otherwise reach the host as a cast nothing checks.
