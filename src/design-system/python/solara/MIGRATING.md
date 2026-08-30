# Migrating a Solara portal onto the KBase design system

The package ships two kinds of stylesheet. `tokens.css` and `solara/vuetify.css` carry colours, type
and Vuetify widget styling, and apply to any markup. `components.css` and `chrome.css` are about
4,000 lines that select `kb-*` class names and match nothing else.

Migration replaces a portal's class names with `kb-*`. Progress is countable:

```
grep -rohE '\bkb-[a-z0-9-]+' src/ | sort -u | wc -l
```

---

## 1 · Inventory the portal's classes

Each class in the portal's stylesheet takes one of three routes:

- **A component exists.** The markup gains a `kb-*` name; the rules that styled it are deleted.
- **No component exists yet.** genKnown's trust pill, its `data-tip` tooltip and its citation footer
  have no equivalent.
- **The class is specific to this portal.** Domain visualisations and one-off layouts stay.

The second route sets how much of the work lands in this package rather than the portal.
`ds-v0.8.1` holds three components that Function Junction's migration required: a Loader that runs
in a document with no React, a Chip whose icon is sized from its own text rather than a fixed 9px,
and a Breadcrumbs step that keeps its metrics when Solara renders it as a `v-btn`. Each began as a
gap in someone's inventory.

---

## 2 · Declare the dependency in `[project.dependencies]`

`design_system_sheets()` in the fleet's `theme.py` returns `[]` on two conditions: the selected skin
is `legacy`, or `kbase-design-system` is not installed. Both drop all six sheets, not a token block.

A portal whose markup carries its own class names renders in full under that condition — its own
stylesheet paints every element, and its token names fall back to the hardcoded values beside them.
A portal whose markup carries `kb-*` names renders unstyled, because the rules that match them are
in the sheets that did not load and the portal's own rules were deleted as each component landed.

Three consequences reach the portal's own code:

- The package belongs in `[project.dependencies]`. Declared in a `[skin]` extra, a missing install
  produces an unstyled page; declared as a requirement, pip refuses to install the portal at all.
- A soft import of `kbase_design_system.solara.icons` with a fallback shim resolves to a page that
  renders without icons and without styling. A plain import raises `ImportError` naming the package.
- `<APP>_SKIN=legacy` selects the package's own `--c-primary` when the portal omits its `brand.css`.
  It selects the portal's pre-migration appearance only while that appearance lives in the portal's
  own rules, which migration deletes.

---

## 3 · Load the sheets

A portal carrying its own copy of the sheets keeps resolving to that copy; Function Junction deleted
5,250 lines under `src/kbase_ds/` before the packaged sheets took effect.

Six sheets, in this order, ahead of the portal's own:

```
tokens.css  →  utilities.css  →  prose.css  →  components.css  →  chrome.css  →  solara/vuetify.css
```

`global.css` sets page-level defaults that a Solara app already sets, and `prism.css` styles Prism's
markup; neither is loaded.

`vuetify.css` opens with four `@import` rules — the Oxygen and Fira Code faces, three Phosphor icon
weights. A browser discards an `@import` that follows any other rule, so joining the sheets into one
string costs the portal its typeface and every icon, and raises nothing.

```python
for sheet in design_system_sheets():   # one string per sheet
    solara.Style(sheet)
solara.Style(OWN_CSS)
```

### The skin

A skin is a stylesheet of token overrides, loaded after the packaged sheets, carrying whatever brand
the portal wears. `tokens.css:82` declares `--c-primary` outside any `light-dark()` and
`tokens.css:98` derives `--ct-primary` from it once per scheme, so one hue stated in a skin produces
both schemes and every primary-family token follows. Any of the other 66 colour tokens can be set
the same way; the design system's README lists them.

Hex, `rgb()` and `rgba()` values elsewhere in the portal's stylesheet hold colours no skin reaches.
genKnown has 27, one of them a teal behind the accent border of its card.

### Vuetify's palette

Vuetify stores its theme as comma-separated RGB triplets and reads them as
`rgba(var(--v-theme-surface), α)`. No CSS expression decomposes a colour into three numbers, so
ipyvuetify's traits carry the values from Python, and Vuetify derives the rest — including the
on-colours it picks by contrast. Left unset, the widgets blend against Material's `#6200ee`.

```python
from kbase_design_system.solara import theme
for scheme, colours in theme.vuetify(SKIN_CSS).items():
    target = getattr(solara.lab.theme.themes, scheme)
    for trait, value in colours.items():
        setattr(target, trait, value)
```

`SKIN_CSS` is the same string the portal loads into the page. `theme.vuetify()` lays its
declarations over the packaged tokens as the cascade would, evaluates the `oklch(from …)`
expressions as arithmetic, and returns thirteen traits per scheme. Called with nothing it gives the
design system's own palette.

Passing a colour instead of the stylesheet leaves ten of the thirteen on the packaged palette, since
a skin that moves the ground, the ink ramp or a semantic colour moves tokens no single hue carries —
the sheets follow the skin and the widgets do not.

---

## 4 · Learn the naming rule

`gen_portal_css.py` derives every public class name from the component's CSS module:

```
root, or a local named after its component  ->  kb-<component>
every other local                           ->  kb-<component>--<local>
```

A local named after its component takes the short name when the module declares no `root`; Badge
declares both, so `.root` becomes `kb-badge` and `.badge` becomes `kb-badge--badge`.

State travels in attributes — `data-active`, `data-loading`, `aria-disabled`. A component keyed on a
class cannot be driven from a template that sets attributes.

---

## 5 · Chrome

Renders on a landing page with no data.

`kb-masthead`, `kb-mark`, `kb-breadcrumbs`, a light/dark control and a version badge take over from
the portal's own topbar. `chrome.css` holds the first two; `components.css` holds Breadcrumbs.

`vuetify.css` sets `color-scheme` on `.v-theme--light` and `.v-theme--dark`, so every `light-dark()`
pair in `tokens.css` resolves to whichever theme Vuetify holds. Scheme needs no further wiring.

Solara renders a breadcrumb step as a `v-btn` once its target is a callback, and Vuetify's 16px of
side padding lands on that one step. `vuetify.css` sets `padding: 0` on `.v-btn.kb-breadcrumbs--link`
to match it to the steps rendered as `<a>`.

---

## 6 · Forms and actions

Renders on a landing page with no data.

`kb-search-bar` and `kb-field` for inputs, `kb-button` for actions, `kb-chip` for example and filter
rows. `vuetify.css` already restyles `.v-btn` and `.v-field`, so these widgets change little when the
classes land; the classes carry their states and density.

Chip sizes its icon at `1.15em` and its dismiss control at `1em`, from the ratio Button holds between
its icon and its label. A pixel size holds while the label's size changes around it.

---

## 7 · Content

Needs data, or fixtures in place of it.

`kb-frame`, `kb-stat`, `kb-alert`, `kb-table`, `kb-badge`, `kb-progress`, `kb-skeleton`,
`kb-empty-state`, `kb-popover`. Each arrives with the deletion of the rules it replaces: an element
carrying both a `kb-*` name and the portal's own resolves to the portal's own, which usually wins on
specificity.

`Skeleton` defaults to `variant='text'`, and a `kb-skeleton` with no variant has no height. A card
placeholder is a composition of variants, which the showcase holds.

A loader plays its entry from `data-active` in CSS. Its exit starts from the pose its animations hold
at the moment it is asked to stop, which exists only at runtime, so `loader.js` beside this file
builds it with the Web Animations API and shares its formulas with `Loader.tsx`. The presence of
`data-loading` on a loader or an ancestor hands it to the script; the attribute's value is the state.

Every state of one region occupies one box. A row of controls replaced by a spinner, or a loader
appended below streaming content, moves each element beneath it on every transition.

Stages 1–6 complete against a landing page. A portal whose content needs a backend it cannot reach
locally can stop before this one rather than write markup nobody has seen render.

---

## 8 · Prose, type and icons

`prose.css` styles descendants of a `.prose` container, which is the shape Solara's Markdown output
takes. Type comes from the utility classes. Icons come from the three Phosphor weights `vuetify.css`
imports — regular for chrome, bold for emphasis, fill for an active state.
