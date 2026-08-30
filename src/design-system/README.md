# `@kbase/design-system`

KBase design system: components, tokens, and styles. Source at
`src/design-system/`. Published to GitHub Packages npm.

---

## Install

```bash
echo "@kbase:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=<GHCR_PAT>" >> ~/.npmrc

npm install @kbase/design-system
```

PAT scope: `read:packages`.

Peer dependencies: `react`, `react-dom`, `@base-ui/react`,
`@phosphor-icons/react`, `prismjs`. React 18 and React 19 are both
supported. The other three are required at the versions this repo
builds and tests against, taken from its own dependency versions at
build time and recorded in the published `package.json`.
`@phosphor-icons/react` is a hard peer dependency: every icon-using
component imports from it.

### Without a bundler

There is also a pip package, for consumers that cannot run one — a generator
that inlines CSS into self-contained HTML, or a Python UI framework handed a
string. Install by pinned tag:

```toml
"kbase-design-system @ git+https://github.com/kbase/next-gen-ui.git@ds-vX.Y.Z#subdirectory=src/design-system"
```

Pin a released `ds-v` tag; [Releases](https://github.com/kbase/next-gen-ui/releases)
lists them. The repository is public and pip clones it directly, so this route
needs no credentials — the `read:packages` token above belongs to the npm
registry.

```python
from importlib.resources import files
css = (files("kbase_design_system") / "tokens.css").read_text()
```

It carries seven stylesheets and a Solara adapter:

|                                                                   |                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css` `prose.css` `utilities.css` `prism.css` `global.css` | the same files the npm package ships                                                                                                                                                               |
| `components.css`                                                  | every component in `components/`, compiled from its `.module.scss` during the wheel build, with stable class names — see [Class names for CSS-only consumers](#class-names-for-css-only-consumers) |
| `chrome.css`                                                      | the app bar, masthead, mark and tinted ground, which the showcase builds as layout rather than as components; Frame's default padding, which is set in a TSX; and the scrim under a neutral name   |
| `solara/`                                                         | `vuetify.css`, `icons.py`, `loader.js`, `theme.py` and `oklch.py`. Solara renders its widgets with Vuetify, whose theme is set from Python                                                         |

`loader.js` is the one script in the package, and like `components.css` it is
assembled during the wheel build rather than committed. The Loader's enter is
CSS — `data-active` on `.kb-loader--loader` plays it — but its exit needs the
pose the animations hold at the instant it is asked for, which is known only at
runtime. `Loader.tsx` builds that exit in React; `loader.js` builds it for a
document with none, and both take the math from
`components/Loader/pose.js`, which `python/gen_loader_js.py` joins to
`python/loader_driver.js` for the wheel.

Include it once with `icons.loader_script()`, and put `data-loading` on a loader
or on any ancestor, set to `"false"` when the work ends. Presence hands the
loader to the script, the value is the state, and a loader with no
`data-loading` above it is left as rendered — which is how a document keeps one
that runs for as long as it is on screen. Emit the mark with
`icons.loader(size, active=...)`; without the script, clearing `active` pauses
the braid where it stands and the dots jump to the row.

`theme.py` answers the one question a stylesheet cannot: what colour is this,
as a number. Vuetify holds its theme as comma-separated RGB triplets, and CSS
cannot decompose a colour into three, so `theme.vuetify(skin_css)` returns the
thirteen traits ipyvuetify syncs, per scheme, resolved against the portal's own
skin.

Most of `tokens.css` is `oklch(from var(--c-base) L C H)` — arithmetic with one
answer, which `oklch.py` computes. `theme.py` reads the stylesheet the wheel
already carries and resolves it on the first call, so there is no browser, no
build step and nothing generated.

`style.css` is a bundler output and stays npm-only. `fonts.css` is excluded —
see [Fonts](#fonts) for why it needs a bundler, and what a consumer without one
has to do instead. The wheel takes its version from the same `ds-vX.Y.Z` tag
that publishes the npm package, so neither needs a bump.

Building the wheel compiles Sass, so `dart-sass` is installed into the build
environment. It is not a runtime dependency.

## Class names for CSS-only consumers

A React consumer never writes a component's class name; the bundler rewrites
it to a content hash. A consumer holding only `components.css` writes it by
hand, so the names in that file follow one rule and do not change:

```
root, or a local named after its component  ->  kb-<component>
every other local                           ->  kb-<component>--<local>
```

Frame's root is `kb-frame`. Button's root local is `btn`, so it is
`kb-button--btn`. State is an attribute rather than a class: `[data-active]`,
`[data-checked]`, `[data-selected]`.

## Use

```tsx
import { Button, Alert } from '@kbase/design-system';
import '@kbase/design-system/style.css';
import '@kbase/design-system/fonts.css';
```

`style.css` is the all-in-one bundle: tokens, utilities, resets, and
component styles in correct order. `fonts.css` is separate — see
[Fonts](#fonts). Granular entries are available for opt-in:
`components.css`, `global.css`,
`fonts.css`, `prism.css`, `prose.css`, `utilities.css`, `tokens.css`. See
[Layering](#layering).

---

## Theming

The tokens ship both themes. Which one resolves is decided by one attribute on
`<html>`:

| `data-theme` | Result                       |
| ------------ | ---------------------------- |
| absent       | follows the OS (the default) |
| `light`      | light, even on a dark OS     |
| `dark`       | dark, even on a light OS     |

Nothing else is required — no provider, no class on `<body>`, no JS.

### Without a bundler

Set the attribute however the page already renders. That is the whole
integration:

```html
<html data-theme="dark"></html>
```

To let a page remember a choice, store it under `kbase-theme` and stamp the
attribute before the first paint, so a dark-theme user never sees a light
frame:

```html
<script>
  (function () {
    try {
      var v = localStorage.getItem('kbase-theme');
      if (v === 'light' || v === 'dark') document.documentElement.setAttribute('data-theme', v);
    } catch (e) {}
  })();
</script>
```

### In React

`useTheme()` does the same thing, and persists the choice under the same key,
so the two consumers agree:

```tsx
const { theme, setTheme } = useTheme(); // 'system' | 'light' | 'dark'
```

Inline `themeInitScript` in `<head>` for the pre-paint stamp:

```tsx
<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
```

### How the two themes are stored

Every themed token carries both values on one line:

```css
--c-bg: light-dark(#f5f2ee, #17140f);
```

`light-dark()` reads the element's `color-scheme`, which is the only thing the
three rules above set. There is no second copy of the palette to keep in step.

`light-dark()` takes colors, so the lightnesses and chromas the tints are built
from cannot go inside it. Those sit in `:root` as pairs — `--tl-bg` and
`--tl-bg-dark` — and each half of the tint's `light-dark()` reads its own.

---

## Skins

A skin is a stylesheet of token overrides, loaded after `tokens.css`, carrying
whatever brand it expresses. It may set **any** color token — there are 67, and
every one is a custom property, so a skin replaces whatever it names:

| Group          | Tokens                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Ground and ink | `--c-neutral`, `--c-bg`, `--c-raised`, `--c-surface`, `--c-border`, `--c-border2`, `--c-ink`–`--c-ink5`, `--c-neutral-200/300` |
| Semantic       | `--c-primary`, `--c-green`, `--c-yellow`, `--c-red`                                                                            |
| Auxiliary      | `--c-purple`, `--c-teal`, `--c-ocean`, `--c-orange`, `--c-grellow`, `--c-frost`                                                |
| Text on tint   | `--ct-primary` … `--ct-orange`                                                                                                 |
| Tints          | `--bg-*`, `--bo-*`, `--bgw-*` (8 families each)                                                                                |
| Interactive    | `--c-primary-dim`, `--c-teal-btn`, `--c-teal-dim`, `--c-purple-btn`, `--c-purple-dim`, `--c-focus`                             |
| Elevation      | `--c-shadow`, `--c-scrim`, `--e-1`–`--e-4`                                                                                     |

Twelve of those carry literal color and the other 55 derive from them, so a
partner who hands over twelve colors re-skins the whole system:

```css
:root {
  --c-neutral: #6b7080; /* ground temperature */
  --c-primary: #5d01b9;
  --c-green: #4c9a2a;
  /* … the four semantic, six auxiliary, and --c-shadow */
}
```

**That is a default, not a ceiling.** Derived tokens are ordinary custom
properties: name one and the derivation gives way. `example-brand.css` in this
directory does exactly that — its page is a tinted mid-light rather than an
off-white, which no hue change can produce, so it sets the ground, ink ramp,
tints and text-on-tint outright. It is not exported and not packaged; the
design system supports skins rather than carrying anyone's brand.

A skin scoped to an attribute rather than a bare `:root` lets several ship
alongside each other with one value choosing between them. `example-brand.css`
opens `:root[data-skin='example']`, so the page wears KBase's palette while the
attribute is absent and the example brand while it reads `example`. An app
stamps the attribute once in its own HTML; the showcase toggles it, which is how
both palettes appear against the same components.

### What the derivation gives you

Derived tokens read a base's hue and chroma and pin their own lightness, so a
hue change keeps the contrast the default palette was built with. Chroma is
scaled rather than fixed, so a base with no chroma yields a ramp with no chroma
— the warm cream is KBase's palette, not something the system imposes.

Set a derived token directly and you own the result. Two things worth knowing
if you move the ground:

- The lightness steps for tints are `--tl-bg`, `--tl-bo` and `--tl-bgw`. They
  are measured from an off-white page; on a darker one, tints land lighter than
  the page and read as highlights. `example-brand.css` resets them.
- A saturated page has less contrast headroom than an off-white one, so very
  dark text tops out lower. Keep body text comfortably legible and it is fine.

### Beyond color

Color is not the whole of an identity. These are honored by every component
that uses them, with no stylesheet holding a hardcoded value:

| Lever           | Tokens                                     | Notes                                                                                                                                             |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typeface        | `--f-sans`, `--f-mono`                     | the design system serves only its own two faces; a skin pointing these elsewhere serves that font itself                                          |
| Corner rounding | `--r-sm`, `--r-button`, `--r-md`, `--r-lg` | box corners                                                                                                                                       |
|                 | `--r-full`                                 | **leave alone.** Radio and the Switch track use it to stay circular, and a square radio reads as a checkbox. Shape is carrying meaning, not style |
| Type scale      | `--fs-1`–`--fs-11`, `--fs-hero`            | sequential, smallest to largest                                                                                                                   |
| Weight          | `--fw-normal`, `--fw-bold`                 | two, because `fonts.css` serves two faces                                                                                                         |
| Density         | `--s-1`–`--s-12`                           | the whole spacing scale                                                                                                                           |
| Motion          | `--t-fast`, `--t-base`, `--t-slow`         |                                                                                                                                                   |

`--z-raised`, `--z-scrim`, `--z-modal` and `--z-toast` are not skin levers.
They carry no identity, and changing them only breaks the layering of modals
and toasts.

`fonts.css` serves 400 and 700, so there are two weight tokens and no more.
Stylesheets used to write 400, 500, 600 and 700, but CSS resolves a request to
the nearest face available: 500 drew as regular and 600 as bold. A skin whose
brand serves a family with real intermediate weights adds the faces to its own
stylesheet and a token to match.

`example-brand.css` sets the typeface and the box radii as well as its colors.

## Layout

```
src/design-system/
  index.ts                  Public surface. Anything not re-exported here is private.
  components/<Name>/        Component.tsx, Component.module.scss, index.ts
  fonts.css                 Optional @font-face loading. Not in style.css.
  prism.css                 Syntax theme for CodeBlock.
  prose.css                 .prose: the elements a Markdown renderer emits.
  utilities.css             Type utility classes: .h1, .body, .link, …
  tokens.css                The custom properties.
  global.css                Element resets and globals.
  util/cx.ts                Class-name helper.
  sections/, appendix/      In-app demo content. Not in the published package.
```

Component slots in `index.ts` define the package surface. Adding a
new component:

1. Create `components/<Name>/{<Name>.tsx,<Name>.module.scss,index.ts}`.
2. Re-export from `src/design-system/index.ts`.
3. Optional: add to the showcase tour at `/design-system`.
4. New external dependency? See [Externals](#externals).

### Composing a trigger

Base UI parts reach the element `render` returns through a ref, so anything
here with a `render =` default must be a `forwardRef`. React 18 cannot pass a
ref to a plain function component; React 19 can, which hides the mistake. The
suite runs on both.

```tsx
<Tooltip.Trigger render={<Toolbar.Button aria-label="Refresh" />} />
```

### Toast actions

`useToastManager().add()` takes `actionProps`: one control, rendered inside
the message. Nothing renders when it is absent.

```tsx
toasts.add({
  title: 'Assembly complete',
  actionProps: { children: 'View report', onClick: open },
});
```

### Code languages

`CodeBlock` bundles python, typescript, jsx and tsx, and accepts any other
grammar the host has registered on Prism, which is a peer dependency. An
unregistered language renders unhighlighted.

---

## In-repo usage

The host app imports from source via the `@kbase/design-system` alias
(declared in `vite.config.ts` and `tsconfig.json`'s `paths`). No build
step needed; Vite and `tsc` resolve straight to `src/design-system/`.

---

## Build

```bash
npm run build:design-system
```

Output: `dist-design-system/`.

| File                         | Contents                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `index.js`                   | ESM bundle of the public surface.                                            |
| `index.js.map`               | Source map.                                                                  |
| `style.css`                  | All-in-one: tokens + utilities + resets + component styles.                  |
| `components.css`             | Component styles only (no tokens, no resets).                                |
| `global.css`                 | Element resets, mirrored from `src/design-system/global.css`.                |
| `tokens.css`                 | The custom properties.                                                       |
| `prism.css`, `utilities.css` | Syntax theme and type utilities.                                             |
| `prose.css`                  | `.prose`, for rendered Markdown.                                             |
| `fonts.css`                  | Optional `@font-face` loading. Not part of `style.css`.                      |
| `types/`                     | `.d.ts` declarations emitted by `tsc`.                                       |
| `package.json`               | Generated. Version from `DS_VERSION` env or root `package.json` as fallback. |

Inspect the would-be tarball: `cd dist-design-system && npm pack --dry-run`.

### Externals

Not bundled into `index.js`:

- `react`, `react/jsx-runtime`, `react-dom` (and submodules)
- `@base-ui/react/*`
- `@phosphor-icons/react`
- `prismjs` (and submodules)

When adding a new external, update both:

- `vite.config.designsystem.ts` → `rollupOptions.external`
- `scripts/build-design-system.mjs` → `peerDependencies`

---

## Release

A `ds-vX.Y.Z` GitHub release publishes `@kbase/design-system`
at version `X.Y.Z`. The version is derived from the tag; the workflow
sets `DS_VERSION=X.Y.Z` and feeds it to the build. No `package.json`
bump required.

```bash
gh release create ds-v0.2.0 --title "Design system v0.2.0" --notes "..."
```

The `publish` job in `.github/workflows/design-system.yml` then:

1. Extracts the version from the tag.
2. Runs `npm run build:design-system`.
3. `npm publish` to `https://npm.pkg.github.com`.
4. Attaches the `.tgz` as a release asset.

App releases (`vX.Y.Z`) and design-system releases (`ds-vX.Y.Z`) are
independent triggers. The Docker workflow (`docker.yml`) is unaffected
by `ds-v*` tags.

PR builds and main-branch pushes run only the `build` job: no publish.
The artifact's version label falls back to root `package.json`.

---

## Layering

This is the npm package. The combined `style.css` concatenates the layers in
this order; use the granular entries instead if a specific layer needs to be
skipped or replaced. The wheel carries a different set — see
[Without a bundler](#without-a-bundler) for what it holds, and the
`solara/MIGRATING.md` it ships for the order a Solara portal loads them in.

1. `tokens.css`: design tokens (`--c-*`, `--s-*`, `--r-*`, …)
2. `prism.css`: Prism syntax theme
3. `prose.css`: `.prose`, for rendered Markdown
4. `utilities.css`: `.h1` / `.h2` / `.body` / `.caption` / `.note`
5. `global.css`: element resets and globals
6. `components.css`: bundled component styles

## Fonts

`fonts.css` imports Oxygen and Fira Code from the Fontsource packages,
which ship as dependencies. It is not part of `style.css`, because the imports
are bare specifiers: they need a toolchain that resolves those inside a CSS
`@import` — Vite and webpack's `css-loader` do, a bare PostCSS pipeline without
`postcss-import` does not, and a browser cannot.

If your pipeline passes CSS imports through untouched, import the faces from JS
instead, which any bundler handles:

```js
import '@fontsource/oxygen/400.css';
import '@fontsource/oxygen/700.css';
import '@fontsource/fira-code/400.css';
import '@fontsource/fira-code/700.css';
```

**Serving `style.css` from a plain `<link>` gets you no webfonts**, and
`--f-sans` / `--f-mono` fall back to `system-ui` and the platform monospace. The
package has no build-free entry for the faces, but the page can load them
itself — self-hosted, or from a CDN:

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Oxygen:wght@400;700&family=Fira+Code:wght@400;700&display=swap"
/>
```
