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
`@phosphor-icons/react`, `prismjs`. Required versions are recorded in
the published `package.json` and tracked from the host repo's
dependency versions at build time. `@phosphor-icons/react` is a hard
peer dependency: every icon-using component imports from it.

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
`fonts.css`, `prism.css`, `utilities.css`, `tokens.css`. See
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

## Layout

```
src/design-system/
  index.ts                  Public surface. Anything not re-exported here is private.
  components/<Name>/        Component.tsx, Component.module.scss, index.ts
  fonts.css                 Optional @font-face loading. Not in style.css.
  prism.css                 Syntax theme for CodeBlock.
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

The combined `style.css` concatenates the layers in this order. Use
the granular entries instead if a specific layer needs to be skipped
or replaced.

1. `tokens.css`: design tokens (`--c-*`, `--s-*`, `--r-*`, …)
2. `prism.css`: Prism syntax theme
3. `utilities.css`: `.h1` / `.h2` / `.body` / `.caption` / `.note`
4. `global.css`: element resets and globals
5. `components.css`: bundled component styles

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
