# Workbench

The workbench is the shell: sidebar, dockable tab groups, menubar, prompt bar, status bar.
A **layout** is the saved arrangement. Plugins supply panels; the workbench decides where they
go and remembers it. (`workspace` is the KBase data service and is not used here.)

What a plugin author needs is documented elsewhere and is not repeated here: `plugins/sdk/README.md`
for how the package is built and depended on, and the workbench's own **Plugin developer documentation**
page — `/plugin-docs` in a running workbench, `react/pages/docs/Docs.tsx` in the tree — for the
manifest, the six modules, the handles and the deployment paths. `Docs.contract.test.ts` fails when
that page and the SDK disagree, which is why it, and not this file, is where the contract is
written down. This file is for someone changing the workbench.

## Directories

Imports run one way down this table. Each row may import the rows above it and nothing below,
and `eslint.config.js` fails the build on an edge that goes the other way.

| path                | contents                                                                                                                                                                                              | may import                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `core/`             | `Layout` schema, operations, `reduce`, `describe`, snapshot undo store, serialization, the subscribable-store primitives                                                                              | zod; SDK types, not SDK code                              |
| `commands/`         | command registry, slash parser and completion, keybinding chords, the workbench's own commands                                                                                                        | `core`; SDK types, not SDK code                           |
| `host/`             | index of installed plugins, module loading, `openRoute`, the query runner, status polling, settings, registry fetch, the panel titles, trails and announcements, `WorkbenchServices`, `pluginHostFor` | `core`, `commands`, the SDK; no React                     |
| `react/`            | every component and hook: the shell, DnD, URL sync, panel layer, live region, the icon table, and the host's own plugins under `react/pages/`                                                         | `core`, `commands`, `host`, the SDK, the design system    |
| `compose/`          | `createWorkbench()` and `hostPlugins()` — the one module that builds a workbench out of all four                                                                                                      | everything                                                |
| `../plugins/sdk/`   | what a plugin imports: the manifest contract, the six `define*` helpers, `fromReact`, the hooks, the federation preset                                                                                | React, zod, the design system; nothing from the workbench |
| `../plugins/local/` | the bundled plugins: koros, data, jobs, intent                                                                                                                                                        | the SDK                                                   |

Two rules in that table are not obvious. **SDK types, not SDK code**: `core` writes the layout
model in the plugin contract's vocabulary (`CartItem`, `Offer`, `Match`), and a type import is
erased, so it costs nothing; a value import would pull React in behind it. **`host` has no
React**: the host builds and holds what a workbench is made of and draws none of it, which is
why a plugin's `icon` and `color` reach `PluginInfo` as the names its manifest gave and become
glyphs only in `react/icons.ts`.

`compose/` exists because the host's own pages are React components that have to be registered
into the host's plugin index. Something must touch both; if that something lived in `host/`,
`host` and `react` would import each other again. A component takes its workbench from
`useServices()`, never by calling `createWorkbench` — that is the arrow the fence over `react/`
is there to stop.

Routes: `src/routes/_workbench.tsx` draws the shell once; `_workbench/workbench.tsx` is the bare
workbench and `_workbench/p.$pluginId.$.tsx` resolves a deep link through `openRoute`. Both
children render nothing.

## Invariants

These hold across files, so no one file states them.

**A panel is drawn once and mounted once.** Every panel body lives in one flat layer
(`react/PanelLayer.tsx`), positioned over the box its place in the layout measures out
(`react/panelSlots.ts`). Moving a tab between groups, splitting a group, and moving a pane
between the sidebar and the main area change which box a body follows and never the body's
parent, so React does not unmount it and a plugin's `mount` runs once for the life of the panel.
Two slots may name one panel — a pinned pane's block and the flyout its rail icon opens — and the
shown slot with the highest priority is where it is drawn, which is what keeps one panel to one
mount. A browser reloading an `<iframe>` whenever it moves in the DOM is what forced the
arrangement, but nothing in it is about iframes.

**A storage key names a shape.** `workbench.layout.v4`, `workbench.settings.v5`,
`kbase-workbench-cart.v4`. A document that fails its schema — or a layout that breaks a
structural rule the schema cannot state, which is `core/serialize.ts`'s `validate` — is discarded
for the default rather than repaired: the reader loses an arrangement, not their work, and a
default is always renderable. There is no version field inside a document and no migration step.
A change to a shape is a new key; the old key is left in storage and never read again.

**Three documents, not one.** The cart and the settings are saved beside the layout because they
outlive it. Discarding a layout whose shape moved must not take the reader's collected items or
their rebound keys with it.

**Keybindings are settings, not layout,** for that reason: a chord the reader chose should survive
the next change to the layout shape. `commands/keys.ts` merges the stored table over
`DEFAULT_KEYBINDINGS`, so only what the reader changed is stored; `''` silences a default without
putting anything in its place, and an override naming a command that is not registered is skipped,
so the chord means its default again while the plugin that declared the command is away and means
the override again if it returns.

**Focus is in the layout; the caret is not.** `focus` is a `PanelId` in the document, so it is
restored with the arrangement. Whether DOM focus follows is `Operation.focus`'s `by`: `'user'` is a
pointer or a focus event, whose caret is already where the reader put it, and `'command'` — what an
absent `by` means — moves the caret to the panel that gained focus. Omitting it costs a caret jump,
never a lost one.

**Undo restores snapshots,** so no operation needs an inverse. `operations.ts`'s `UNDOABLE` and
`reduce.ts`'s `LOCKED_OUT` answer different questions and neither implies the other: `open` is
undoable and is allowed on a locked layout; `resize` is refused when locked and is no undo step.
A locked layout keeps its arrangement (`move`, `resize`, `pin`, `unpin`) while using it stays free.

**The host never parses a path.** A panel's `path` is everything under `/p/<plugin>`, query string
included, carried whole. Whether two paths are one page is the route module's `normalize` to say,
and `host/open.ts` is the only place that asks: a match is focused, otherwise a new panel opens.
A plugin can therefore change its own URL scheme without the workbench knowing.

**A tab and a trail are different content.** The tab names the thing you would switch to; the trail
says where you are inside it. They meet in one place: when two tabs in one group carry the same
title, `react/labels.ts` borrows the deepest crumb at which their trails differ (`Structure · P0A7B8`
beside `Evidence · P0A7B8`) and numbers only what no trail can separate. Pressing a crumb moves that
panel to that path — it opens nothing, which is what makes a trail a trail and not a set of links.

**Every surface is one registry.** Menus, chords, the prompt bar, and a plugin's `host.execute` all
reach `commands/registry.ts`, and nothing in the chrome does anything a command cannot. Commands are
registered as `<source>:<name>` from the manifests before any plugin code loads, so the bar completes
and validates cold; running one is what fetches the plugin's `commands` module. `workbench:open` is
registered in `compose/createWorkbench.ts` and not beside the rest in `commands/workbench-commands.ts`
because opening a page needs the host index and the route module, and `commands/` is below `host/`.

**One live region.** `core/describe.ts` words an operation, `host/announcer.ts` holds the last
sentence, and `react/LiveRegion.tsx` is the single `role="status"`. dnd-kit's own announcements are
turned off (`WorkbenchDnd.tsx`), so a drag is spoken once, by the operation it dispatched, in the
same words the keyboard route for it produces.

**The sidebar's preview is not a layout operation.** One unpinned plugin at a time is shown as an
ephemeral block (`services.preview`); pinning is what commits it, and a reload forgets it. A row a
reader reached by typing a name must not rearrange the workbench, which is why `workbench:show`
focuses a pinned pane and previews an unpinned one, and `workbench:open` — asked for by name — is
what makes a tab. Collapsing the sidebar is the icon rail; there is no separate strip to keep in
step with the pinned list.

## What free text does

Two clocks, two questions, two destinations. `host/query/runner.ts` runs both.

Typing, on the keystroke: every background's `terms` (synchronous, no I/O) pools what it recognises
in the text, every `offer` is asked with the text and that pool, and the chosen intent's `suggest`
is asked with the offers and with the terms tiered by where they came from — `typed`, `page`, `cart`.
Nothing waits: a slow plugin's offer lands when it lands and the intent is asked again, and the next
keystroke is a new question. The workbench matches no text itself. Every row under the bar except
`Send to <assistant>` is the intent's answer, four at most, drawn in the order it returned them, so
a workbench whose intent plugin is missing offers only that row.

The page and the cart, 250 ms after their terms change (`SETTLE_MS` — long enough that adding three
items to the cart is one round of questions): every `relate` is asked, its answers are items, and the
items are the rows in the Related pane. The plugin whose own front tab produced the terms is not
asked about them. Each plugin's answer replaces its own section as it arrives, the previous one
dimmed until then; after `BUDGET_MS` the pane stops saying it is asking, and a later answer still
lands. A pool that only grew is asked about the new terms alone and the answers merge, so a cart
gaining an item does not re-ask about the items already in it.

Two settings name plugins: the **assistant**, whose `prompt` module receives free text with the
term pool and the cart as attachments, and the **intent**. Neither can be "none" — a workbench is
built with both chosen (`createWorkbench`), and the only way to have neither is to name a plugin
that is not installed. `status` and `destination` are pushes, not polls: the plugin calls `set` when
it subscribes and again on every change, and the bar and the status bar draw the last value handed
over. Choosing another assistant ends the previous one's destination subscription and drops its
value, so no destination is ever shown under the wrong plugin's name.

## Deep links

`/p/<pluginId><path>` names one page. Each history entry the URL sync writes carries the panel it
was written for in `history.state`, so Back returns that panel to that path instead of opening a
second one; the entry a session starts on is claimed for the panel it resolved to. Opening pushes,
a `navigate` inside a panel pushes unless it asked to replace, and moving focus between open panels
replaces — so Back walks what was opened and where it went, not every click. Panes have no address
and never touch the URL.

## Accessibility

Every pointer drag has a keyboard or context-menu route (split by direction, move to sidebar,
reorder pins) and both paths dispatch the same operation, which is what keeps the two from drifting.
Tabs are a `tablist` with roving tabindex; blocks are labelled `section`s with `aria-expanded`
headers; splitters are focusable `separator`s with `aria-valuenow`. A hidden panel body stays
mounted, so it is taken out of the accessibility tree and out of tab order with `inert` and
`aria-hidden` rather than by not existing.

## Deferred

Signing or subresource integrity of remote entries; per-plugin settings schemas; peer version ranges
beyond the shared-singleton list; per-plugin permissions; presets and org or portal layout overrides;
migrating a saved document instead of discarding it.

An error boundary does not contain a hang in a synchronous render, a memory leak, mutation of globals
(window, document, prototypes), CSS that escapes the panel, or network activity. Containing those
needs isolation the plugin contract does not provide.

## Verification

`npm run typecheck && npm run lint && npm test && npm run build && npm run build:plugin-sdk`.

Manual, against `npm run dev` → `/workbench`: pin and unpin from Settings; fold a block; drag a pane
into the main area; move a tab by menu and by keyboard; reload and check the arrangement came back;
paste `/p/koros/nitro`; type `/op`, `/workbench:open data` and `/cancel 12`; type a question and
watch the Related pane; open Data → Fixtures → Crash test panel and restart it; rebind a key in
Settings → Keyboard and press it.
