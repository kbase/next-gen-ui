# Workbench

The workbench is the shell: sidebar, dockable tab groups, menubar, prompt bar, status bar.
A **layout** is the saved arrangement. Plugins supply panels; the workbench decides where they
go and remembers it. (`workspace` is the KBase data service and is not used here.)

## Directories

| path                | contents                                                                                                                                                              | may import                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `core/`             | `Layout` schema, operations, `reduce`, `describe`, snapshot undo store, serialization                                                                                 | zod only (ESLint fences React and the design system out)  |
| `commands/`         | command registry, slash parser and completion, keybinding chords, the workbench's own commands                                                                        | `core`                                                    |
| `host/`             | index of installed plugins, module loading, `openRoute`, the query runner, status polling, icons, settings, registry fetch, the host's own pages, `createWorkbench()` | everything                                                |
| `react/`            | the components, DnD, URL sync, frame layer, live region                                                                                                               | everything                                                |
| `../plugins/sdk/`   | what a plugin imports: the manifest contract, the five `define*` helpers, `fromReact`, the hooks, the federation preset                                               | React, zod, the design system; nothing from the workbench |
| `../plugins/local/` | the bundled plugins: koros, data, jobs                                                                                                                                | the SDK                                                   |

Routes: `src/routes/_workbench.tsx` draws the shell once; `_workbench/workbench.tsx` is the bare
workbench and `_workbench/p.$pluginId.$.tsx` resolves a deep link through `openRoute`. Both
children render nothing.

## Layout model

```ts
Layout = {
  version: 1,
  panels: Record<PanelId, Panel>,        // flat; every panel anywhere
  main: Node,                            // split{dir,sizes,children} | group{id,tabs,active}
  sidebar: { pinned: PluginId[], folded: PanelId[], sizes, collapsed, width },
  bars: { status, prompt },
  focus: PanelId | null,
  keybindings: Record<chord, commandName>,
  locked: boolean,                       // arrangement fixed; usage stays free
}
```

A panel's id is opaque and stable while the panel lives; its `path` is what it is showing. Two
kinds: a **pane** (one per plugin, id `plugin/pane`; sidebar or main area) and a **route** (main
area only; the plugin's page at a path, id minted on open). The host never parses a path: whether
two paths are one page is the route module's `normalize` to say, and `host/open.ts` asks it when
opening — a match is focused, otherwise a new panel opens. The sidebar holds no panel list of its
own: a pinned plugin's pane is in the sidebar whenever it is not a tab in the main tree. A panel
whose plugin is not installed is a ghost: the slot is kept, the body says why.

`normalize` runs after every tree edit: empty groups go, single-child splits unwrap, same-direction
splits merge, the root is always at least one (possibly empty) group.

## Operations, announcements, undo

`Operation` is the dispatch vocabulary (`open`, `close`, `focus`, `setPath`, `move`, `resize`,
`pin`, `unpin`, `fold`, `sidebar`, `bar`, `bind`, `lock`). `reduce` is pure and returns the same object
for a no-op; with `locked` set it refuses the structural operations (`move`, `resize`, `pin`,
`unpin`) while usage (open, close, focus, fold, bars, collapse) stays free. `describe` words an
operation for the one live region (`role="status"`, sr-only); titles come from the panels, so
the store receives a title lookup. Undo restores whole snapshots: one push per structural
operation. Focus, resizing, bindings and the lock toggle are not undo steps.

Persistence: `workbench.layout.v2` in localStorage, written on every change, read before first
render. A layout that fails schema or invariant validation is replaced by the default rather
than repaired; keys from earlier contracts are removed on boot, never read. Settings that are
not layout (`assistant`) live under `workbench.settings.v1`; the cart under
`kbase-workbench-cart.v2`.

## Sidebar (provisional)

A host **Shortcuts** plugin (like Settings and Home, installed over the same index) shows every
plugin's manifest `shortcuts` as buttons; being an ordinary pane, it pins,
folds, drags and pops out of the rail like any block.

Pinned plugins' panes stack vertically as blocks, splitting the height with dividers; each
scrolls inside itself and the sidebar never scrolls. A block's header carries its plugin's icon
and title (the accordion pattern) and click-toggles the fold; a block folds to its header and is
never hidden; a plugin leaves the sidebar only by unpinning. There is no separate icon rail:
collapsing the sidebar _is_ the icon column — the same pinned list, one icon per plugin in pin
order, each popping its pane out beside it without changing the layout. Unpinned plugins
live under **More** (in the footer strip expanded, among the icons collapsed): a menu naming
them, and choosing one shows its pane as an ephemeral dashed _preview block_ at the bottom
of the stack — two clicks to look at a plugin without pinning it; Pin or dismiss from the
preview's header, and a reload forgets it. Pin drops it at the end of the stack; dragging the
preview by its header onto a block pins it at that block's slot instead. It is painted at the
bottom of the stack wherever it would land — where it sits now is not a claim about the layout
it has not joined. Home offers the same preview for an unpinned panel,
over the one ephemeral preview the sidebar shows (`services.preview`). Any pane can be dragged into the main area as a
tab; closing it there returns it to the sidebar if its plugin is still pinned.

## Breadcrumbs and tab labels

A panel may declare a trail with `usePanelBreadcrumbs([{ label, action? }])`; the host draws it in
a row between a group's tabs and its panel, for that group's active panel only. A panel that
declares none gets no row and no gap, so a split can carry a trail on one side and nothing on the
other. A crumb with an `action` opens it the way a prompt-bar offer does — same shape, same
dispatch; the last crumb is where you are and links nowhere.

A tab and a trail are different content. The tab names the thing you would switch to; the trail
says where you are inside it, and the two are written separately. They meet in one place: when
two tabs **in one group** carry the same title, `negotiateLabels` borrows the deepest crumb at
which their trails differ (`Structure · P0A7B8` beside `Evidence · P0A7B8`), and numbers only what
no trail can separate. A borrowed crumb equal to the title is not borrowed. Labels are settled per
group, so opening or closing a tab can rename its neighbour.

## Commands and the prompt bar

Every command is registered as `<source>:<name>` — a plugin's from its manifest, the workbench's
own (`workbench:close`, `workbench:undo`, `workbench:open`, …) from `commands/workbench-commands.ts`
— before any plugin code loads, so the bar completes and validates cold; running a plugin's
command fetches its `commands` module. The bar accepts a bare name when exactly one command
carries it and offers the qualified forms when two do; `/plugin:name` always works. A plugin runs
another's through `host.execute('plugin:name', args)` and checks with `host.hasCommand`; a handler
receives `{ host, caller }`, where `caller` is the calling plugin's id or `'user'`. A rejection
becomes a toast naming the command and the invoking control shows busy until the handler
settles; `host.notify` raises a toast for an outcome only the plugin can see. Menus, keybindings
and the bar are three surfaces over one registry.

Free text goes to the plugin the settings name as **assistant** — one whose manifest lists a
`prompt` module. The bar fetches that module when Settings names the plugin, calls its `handle`
with the text, the term pool and the cart as attachments (and then empties the cart), and shows
its `destination` above the field: the label, a menu over `options` calling `select`, and a jump
to `path`.

What the bar suggests comes from the **background** modules, fetched from every plugin at
startup. Each keystroke goes to every `terms(q)`; the strings that come back are pooled, expanded
once, and after a 250 ms settle handed to every `recommend`. Each plugin's answer replaces its
own section as it arrives, the previous one staying dimmed until then; after 2 s the pane stops
saying it is asking, and a later answer still lands. A pool that only grew is asked about the
new terms alone and the answers merge. The `commands` it returns are the
rows under the field — each a `CommandCall` the plugin filled in — and the `cartItems` are rows
in the Related pane, one list with the recommendation as the unit: a row keeps its place until
nothing offers it, provenance sits on the row, and what is still being asked is a line under the
rows. Three sources are asked on their own clocks (`host/query/runner.ts`): the
typed text, the front tab's terms (never sent to the plugin that owns the tab), and the cart's.
Under the recommendations the host adds what it can see for itself: shortcut buttons by name,
apps with a `launcher` by name or description, and panes — a pinned one focused where it lives,
an unpinned one previewed. Row zero is what Enter will do.

Home (`host/home/`) is that same search as a page: the apps (manifests with a `launcher`) and
panes installed, searched over the same names and descriptions.

`status()` on each background module is called once its module arrives and after every command;
the status bar shows the last answer. Default keybindings live in `commands/keys.ts` and avoid
chords browsers own; `/` focuses the bar; `Escape` returns to the panel.

## Deep links

`/p/<pluginId><path>` names one page: the plugin's route at its own path, query string included,
which the host carries and never parses. The route loader hands it to `openRoute`, which fetches
the route module, runs its `normalize` on the requested path and on each open panel's, and
focuses a match or opens a new panel. The other way, the focused route panel's path becomes the
URL: pushed when just opened or when the panel `navigate`s, replaced when focus moves between
open panels. Each entry the sync writes carries the panel it was written for in history state,
so Back returns that panel to that path instead of opening another; the entry a session starts on
is claimed for the panel it resolved to. Panes never touch the URL. Closing the addressed panel
replaces the URL with the next focused panel's path, else `/workbench`. A link to nothing is
announced and lands on `/workbench` with the layout untouched.

## Accessibility

Every pointer drag has a keyboard or context-menu route (split by direction, move to sidebar,
reorder pins) and the pointer path dispatches the same operation. One live region; dnd-kit's own
is silenced. Focus is part of the layout and restored with it; when a command moves focus, DOM
focus follows to the tab or block header, while pointer-driven focus is left alone. Tabs are a
`tablist` with roving tabindex; blocks are labelled `section`s with `aria-expanded` headers;
splitters are focusable `separator`s with `aria-valuenow`. App iframes are hidden from pointer
events during a drag.

## Registry API — host side

This is what the host expects of a registry. The registry service itself is not in this repo.

### Endpoint

`GET /plugin-registry/plugins` → `200` with a JSON array of manifests. The path is same-origin,
which is what lets `script-src 'self'` cover remote entries. In dev a Vite middleware answers it
by fetching `<prefix>/manifest.json` from each service named in `VITE_DEV_SERVICE_PROXY` on every
request, so a plugin is listed while its server answers. The built image answers nothing at the
path — its fallback page comes back as HTML — so a deployment either fronts `/plugin-registry/`
and `/services/` with something that does, or runs the bundled plugins alone. The host fetches
once at startup; a non-2xx, a non-JSON, a non-array, or a network failure logs a warning and the
bundled plugins run alone.

### Where the code is

The manifest does not say. A plugin's service is mounted at `/services/<id>/`: it serves the
built `manifest.json` there and the bundle under `/services/<id>/plugin/`, and the host fetches
`<id>/<module>` from `/services/<id>/plugin/remoteEntry.js` for each module the manifest lists.
In dev the Vite proxy maps the prefix to the service's origin; the built image does not proxy
it, any more than it proxies the registry.

### Manifest fields the host reads

Schema: `src/plugins/sdk/contract.ts` (`ManifestSchema`). Invalid entries are skipped
individually with a console warning; one bad manifest does not take the list down.

| field                                   | use                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                    | plugin id; federation remote name; URL segment; service mount                                                                              |
| `title`, `description`, `icon`, `color` | catalog, sidebar icon (both are names from `host/icons.ts`; an unknown icon falls back to a pin, an unknown colour to the surrounding ink) |
| `sdkVersion`                            | must be one of `ACCEPTED_SDK_VERSIONS`; written by the build from the SDK package version it ran with                                       |
| `modules`                               | which of `background`, `route`, `pane`, `commands`, `prompt` the bundle exposes; written by the build from what `vite.config.ts` named     |
| `commands[]`                            | `{ name, title, description?, args[], icon? }`; registered as `<id>:<name>` before code loads                                              |
| `shortcuts[]`, `launcher`               | `CommandCall`s: buttons on the Shortcuts block and on Browse                                                                               |

### Id rules

`^[a-z][a-z0-9-]{1,40}$`. An id is URL-visible (`/p/<id>/…`), the service mount, and the key of
saved layouts, so it never changes once published; a rename is a new plugin plus a registry-side
redirect from the old id. A registry entry whose id matches a bundled plugin is ignored: bundled
code wins.

### Host behaviour per failure

| failure                                     | behaviour                                                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| registry unreachable / non-array            | warning; bundled plugins only                                                                                                                       |
| manifest invalid                            | skipped; others load                                                                                                                                |
| remote entry or a module fails to load      | the panel shows the error inside its boundary; retry re-imports; other panels unaffected; commands of that plugin reject with the error, as a toast |
| a listed module lacks what it should export | `route`/`pane` without `mount`: error inside the panel; `commands` without a declared name: error on run                                            |
| `background` fails to load                  | warning; the plugin makes no terms, recommendations or status                                                                                       |
| plugin removed from the registry            | its panels become ghosts (slot kept, body explains, Close offered); reinstalling brings them back where they were                                   |
| panel throws while rendering                | caught by the panel's own fence (`fromReact`) or the host's boundary; the tab, its group and the chrome keep working                                |

What an error boundary does **not** contain: a hang in a synchronous render, memory leaks,
mutation of globals (window, document, prototypes), CSS that escapes the panel, and network
activity. Those need isolation the contract does not yet provide (see Deferred).

### Deferred

Signing / subresource integrity of remote entries; per-plugin settings schemas; peer version
ranges beyond the shared-singleton list; per-plugin permissions; presets and org/portal layout
overrides; layout migrations past `version: 2`; anything in the image about where plugins live.

## Verification

`npm run typecheck && npm run lint && npm test && npm run build && npm run build:plugin-sdk`.
Manual: `npm run dev` → `/workbench`; pin/unpin from Settings (its Shortcuts button); fold a block;
drag a pane into the main area; move a tab by menu and by keyboard; reload; paste
`/p/koros/nitro`; type `/op`, `/workbench:open catalog` and `/cancel 12`; type a question; open
Data → Fixtures → Crash test panel; switch the assistant to None in Settings.

Settings and Home are pages, not sidebar panels: what is installed and what to open are read
now and then, and a permanent block for each crowds the sidebar. A saved layout that pins a
plugin whose manifest no longer lists a `pane` is unpinned once at startup, because that block
could only render as a ghost; an uninstalled plugin keeps its slot, since reinstalling restores it.
