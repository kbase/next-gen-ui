# Workbench

The workbench is the shell: sidebar, dockable tab groups, menubar, prompt bar, status bar.
A **layout** is the saved arrangement. Plugins supply panels; the workbench decides where they
go and remembers it. (`workspace` is the KBase data service and is not used here.)

## Directories

| path                | contents                                                                                                                                | may import                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `core/`             | `Layout` schema, operations, `reduce`, `describe`, snapshot undo store, serialization                                                   | zod only (ESLint fences React and the design system out) |
| `commands/`         | command registry, slash parser and completion, keybinding chords, the workbench's own commands                                          | `core`                                                   |
| `host/`             | index of installed plugins, manifest routes, icons, settings, registry fetch, deep-link resolver, the catalog page, `createWorkbench()` | everything                                               |
| `react/`            | the components, DnD, URL sync, frame layer, live region                                                                                 | everything                                               |
| `../plugins/sdk/`   | what a plugin imports: manifest contract, `definePlugin`, `usePanel`, `useHost`, `AppFrame`, the federation preset                      | React, zod; nothing from the workbench                   |
| `../plugins/local/` | the bundled plugins: koros, data, jobs, function-junction, genknown                                                                     | the SDK                                                  |

Routes: `src/routes/_workbench.tsx` draws the shell once; `_workbench/workbench.tsx` is the bare
workbench and `_workbench/p.$pluginId.$.tsx` resolves a deep link. Both children render nothing.

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

A panel's identity is `(plugin, kind, params)`; its id is `plugin/kind?sorted-query`, so opening
the same resource twice meets the same panel. Two kinds: a **navigator** (one per plugin; sidebar
or main area) and a **document** (main area only, named by params). The sidebar holds no panel
list of its own: a pinned plugin's navigator is in the sidebar whenever it is not a tab in the
main tree. A panel whose plugin is not installed is a ghost: the slot is kept, the body says why.

`normalize` runs after every tree edit: empty groups go, single-child splits unwrap, same-direction
splits merge, the root is always at least one (possibly empty) group.

## Operations, announcements, undo

`Operation` is the dispatch vocabulary (`open`, `close`, `focus`, `move`, `resize`, `pin`,
`unpin`, `fold`, `sidebar`, `bar`, `bind`, `lock`). `reduce` is pure and returns the same object
for a no-op; with `locked` set it refuses the structural operations (`move`, `resize`, `pin`,
`unpin`) while usage (open, close, focus, fold, bars, collapse) stays free. `describe` words an
operation for the one live region (`role="status"`, sr-only); titles come from the panels, so
the store receives a title lookup. Undo restores whole snapshots: one push per structural
operation. Focus, resizing, bindings and the lock toggle are not undo steps.

Persistence: `workbench.layout.v1` in localStorage, written on every change, read before first
render. A layout that fails schema or invariant validation is replaced by the default rather
than repaired. Settings that are not layout (`assistant`) live under `workbench.settings.v1`.

## Sidebar (provisional)

A host **Shortcuts** plugin (like the catalog and Home, installed over the same index) shows every
plugin's manifest commands flagged `shortcut` as buttons; being an ordinary navigator, it pins,
folds, drags and pops out of the rail like any block.

Pinned plugins' navigators stack vertically as blocks, splitting the height with dividers; each
scrolls inside itself and the sidebar never scrolls. A block's header carries its plugin's icon
and title (the accordion pattern) and click-toggles the fold; a block folds to its header and is
never hidden; a plugin leaves the sidebar only by unpinning. There is no separate icon rail:
collapsing the sidebar _is_ the icon column — the same pinned list, one icon per plugin in pin
order, each popping its navigator out beside it without changing the layout. Unpinned plugins
live under **More** (in the footer strip expanded, among the icons collapsed): a menu naming
them, and choosing one shows its navigator as an ephemeral dashed _preview block_ at the bottom
of the stack — two clicks to look at a plugin without pinning it; Pin or dismiss from the
preview's header, and a reload forgets it. Pin drops it at the end of the stack; dragging the
preview by its header onto a block pins it at that block's slot instead. It is painted at the
bottom of the stack wherever it would land — where it sits now is not a claim about the layout
it has not joined. Home offers the same preview for an unpinned panel,
over the one ephemeral preview the sidebar shows (`services.preview`). Any navigator can be dragged into the main area as a
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

Commands are one kind: a slash name plus typed argument specs, registered before any plugin
code loads, so the bar completes and validates cold; running a plugin's command loads its module.
The workbench's own commands (`close`, `focus-*`, `move-*`, `fold`, `pin`, `unpin`, `undo`,
`redo`, `lock-layout`, `sidebar`, `prompt`) and the host's `/open <plugin> [value]` live beside
plugin commands in one registry. Menus, keybindings and the bar are three surfaces over it.

Free text goes to the plugin the settings name as **assistant** (a manifest with
`promptHandler: true` whose module exports `prompt`). Its handler drives its own UI through the
host; the bar shows Stop while it runs. A destination row above the field names the assistant
and, once its module has loaded, what its `usePromptContext` hook reports: the conversation the
prompt will join, offered as a switcher over the hook's `options` and a jump to its document.
With no assistant set the row says so.

Free text also reaches page-like plugins, two ways. **Plugins volunteer**: an installed plugin
may supply a `match(text)` (`InstalledPlugin.match`, eager, unlike its module, because it runs on
every keystroke) returning offers. An offer names where the row lands you, in the plugin's own
words, and the action that gets there; the host is only the courier — the action becomes the
document's params and the plugin reads it back. Only the plugin knows what its data looks like,
so the host never interprets the query; it calls every matcher, drops one that throws with a
warning, and shows what came back. The bundled matchers show the two shapes this takes: an app
recognises identifiers before it has the data (an accession, an assembly, a binomial), while
Data and Jobs answer from an inventory they already hold, so nothing is offered that is not
there to open.

Under the offers the host adds what it can see for itself: **shortcut** commands by name (one
taking arguments completes into the bar rather than running), apps by **name or description**
(`protein evidence` finds Function Junction), and panels — shown the way Home shows them, a
pinned navigator focused where it lives and an unpinned one previewed, never a layout change to
look at something. `Browse everything` closes the list, opening **Home**.

Row zero of that list is what Enter will do, always rendered: the assistant, with the
alternatives beneath it. Nothing is guessed — the default is visible before the key is pressed
rather than hidden behind knowing to press down.

Home (`host/home/`, a host plugin like the catalog) is that same search as a page: the apps and
panels installed, searched over the same names and descriptions. One search, two densities —
inline while typing, a page when browsing — reached from the bar, from the empty group's
**Browse**, or by name.

Default keybindings live in `commands/keys.ts` and avoid chords browsers own (Ctrl+W/T/N,
Ctrl+Tab, Ctrl+PageUp/Down, Alt+Left/Right). `/` focuses the bar; `Escape` returns to the panel.

## Deep links

`/p/<pluginId>/<route>` names one document by the plugin's declared `document.route`. The route
loader resolves it against the restored layout: open if absent, focus if present. The other way,
the focused document's path becomes the URL: pushed when just opened, replaced when focus moves
between open documents. Navigators never touch the URL. Closing the addressed document replaces
the URL with the next focused document's path, else `/workbench`. A link to nothing is announced
and lands on `/workbench` with the layout untouched.

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

`GET /plugin-registry/plugins` → `200` with a JSON array of manifests. The path is same-origin:
in the container nginx proxies `/plugin-registry/` to `REGISTRY_UPSTREAM` (and answers `[]` when
none is configured); in dev a Vite middleware serves the bundled manifests. Same origin is what
lets `script-src 'self'` cover remote entries. The host fetches once at startup; a non-2xx, a
non-array, or a network failure logs a warning and the bundled plugins run alone.

### Manifest fields the host reads

Schema: `src/plugins/sdk/contract.ts` (`ManifestSchema`). Invalid entries are skipped
individually with a console warning; one bad manifest does not take the list down.

| field                                   | use                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                    | plugin id; remote name; URL segment                                                                                                                |
| `title`, `description`, `icon`, `color` | catalog, sidebar icon (both are names from `host/icons.ts`; an unknown icon falls back to a pin, an unknown colour to the surrounding ink)         |
| `contractVersion`                       | must equal `CONTRACT_VERSION` (1); anything else is invalid                                                                                        |
| `navigator: {}`                         | the module exports `navigator`                                                                                                                     |
| `document: { route }`                   | the module exports `document`; `route` is TanStack-style (`/arc/$slug`, `/` for an app page) and defines the document's params                     |
| `commands[]`                            | `{ name, title, description?, args[] }`; registered before code loads                                                                              |
| `promptHandler`                         | the module exports `prompt`; offered as an assistant in the catalog                                                                                |
| `entry: { url, module }`                | Module Federation remote entry (relative to the registry base or absolute same-origin) and exposed module (`./plugin`); absent for bundled plugins |

### Id rules

`^[a-z][a-z0-9-]{1,40}$`. An id is URL-visible (`/p/<id>/…`) and is the key of saved layouts, so
it never changes once published; a rename is a new plugin plus a registry-side redirect from the
old id. A registry entry whose id matches a bundled plugin is ignored: bundled code wins.

### Host behaviour per failure

| failure                                                             | behaviour                                                                                                                                          |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| registry unreachable / non-array                                    | warning; bundled plugins only                                                                                                                      |
| manifest invalid                                                    | skipped; others load                                                                                                                               |
| manifest without `entry` and not bundled                            | skipped with a warning                                                                                                                             |
| remote entry fails to load                                          | the panel shows the error inside its boundary; retry re-imports; other panels unaffected; commands of that plugin reject with the error, announced |
| module lacks a declared export (`navigator`, `document`, a command) | error inside the panel / announced on run                                                                                                          |
| plugin removed from the registry                                    | its panels become ghosts (slot kept, body explains, Close offered); reinstalling brings them back where they were                                  |
| panel throws while rendering                                        | caught by the panel boundary; the tab, its group and the chrome keep working                                                                       |

What an error boundary does **not** contain: a hang in a synchronous render, memory leaks,
mutation of globals (window, document, prototypes), CSS that escapes the panel, and network
activity. Those need isolation the contract does not yet provide (see Deferred).

### Deferred

Signing / subresource integrity of remote entries; activation events (loading a module for a
reason other than a panel, command or prompt); per-plugin settings schemas; peer version ranges
beyond the shared-singleton list; per-plugin permissions; presets and org/portal layout
overrides; layout migrations past `version: 1`.

## Verification

`npm run typecheck && npm run lint && npm test && npm run build && npm run build:plugin-sdk`.
Manual: `npm run dev` → `/workbench`; pin/unpin from the catalog (its Shortcuts button); fold a block; drag
a navigator into the main area; move a tab by menu and by keyboard; reload; paste
`/p/koros/arc/nitro`; type `/op` and `/cancel 1`; type a question; open Data → Fixtures → Crash
test panel; switch the assistant to None in the catalog.

The catalog and Home are pages, not sidebar panels: what is installed and what to open are read
now and then, and a permanent block for each crowds the sidebar. A saved layout that pins a
plugin the index has since made navigator-less is unpinned once at startup, because that block
could only render as a ghost; an uninstalled plugin keeps its slot, since reinstalling restores it.
