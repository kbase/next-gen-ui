#!/usr/bin/env python3
"""Resolve the KBase design tokens to concrete colours, one set per theme.

Vuetify holds its theme as comma-separated RGB triplets, consumed as
`rgba(var(--v-theme-surface), <alpha>)`. Setting those from Python makes Vuetify generate every
`--v-theme-*` variable itself, including the derived `on-*` colours -- which is what makes the
alpha-modulated rules inside components nobody has styled come out right.

That needs concrete colours, and most tokens are not concrete: they are `oklch(from …)` inside
`light-dark()`, computed by the browser against whichever scheme is in use. Ten or so are literal;
the rest are derived from them. So a browser resolves them, once, and the answer is vendored:

    python python/solara/resolve_tokens.py --node-modules <a checkout>/node_modules \\
        --brand <the portal's brand.css> --out src/<portal>/theme_colors.py

The output belongs to the caller: --brand is per-portal, so the resolved values are too. The
script lives beside the stylesheets it reads, so a change to them is a prompt to re-run it.

Needs Playwright (any node_modules that has it) and the kbase-design-system package installed, which
is where tokens.css is read from -- so the resolved values always match the installed version.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
import textwrap
from importlib.resources import files

# Every token the app or the Vuetify theme mapping reads. Resolved for both themes.
TOKENS = [
    # ground and ink
    "c-bg", "c-raised", "c-surface",
    "c-ink", "c-ink2", "c-ink3", "c-ink4", "c-ink5",
    "c-border", "c-border2", "c-focus", "c-scrim",
    # solid fills
    "c-primary", "c-green", "c-yellow", "c-red", "c-purple", "c-teal", "c-ocean", "c-orange",
    # interactive
    "c-primary-dim", "c-teal-btn", "c-teal-dim", "c-purple-btn", "c-purple-dim",
    # text on tint
    "ct-primary", "ct-green", "ct-yellow", "ct-red", "ct-purple", "ct-teal", "ct-ocean", "ct-orange",
    # tint grounds and borders
    "bg-primary", "bg-green", "bg-yellow", "bg-red", "bg-purple", "bg-teal", "bg-ocean", "bg-orange",
    "bo-primary", "bo-green", "bo-yellow", "bo-red", "bo-purple", "bo-teal", "bo-ocean", "bo-orange",
]

# Vuetify's ThemeColors traits, and the token each takes. accent and anchor are ColorNotAvailable in
# Vuetify 3. warning is orange, not yellow: yellow is the one fill that cannot carry white text, and
# Vuetify picks the on-colour by contrast without asking.
VUETIFY = {
    "background": "c-bg",
    "surface": "c-surface",
    "surface_bright": "c-raised",
    "surface_variant": "c-ink4",
    "on_surface_variant": "c-ink3",
    "primary": "c-primary",
    "primary_darken_1": "c-primary-dim",
    "secondary": "c-teal-btn",
    "secondary_darken_1": "c-teal-dim",
    "success": "c-green",
    "warning": "c-orange",
    "error": "c-red",
    "info": "c-primary",
}

# Reads the tokens off a probe element, which is where light-dark() actually resolves, and converts
# through a canvas rather than by parsing the computed string. Chrome reports an oklch() token as
# `oklch(0.96 0.003 67.3)`, and pulling three numbers out of that yields a colour that is not even
# close -- the canvas does the colour-space conversion properly. Alpha is kept, because --c-focus and
# --c-scrim have it.
SCRIPT = """
(names) => {
  const el = document.createElement('div');
  document.documentElement.appendChild(el);
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  const out = {};
  for (const n of names) {
    el.style.color = `var(--${n})`;
    const used = getComputedStyle(el).color;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = used;               // ignored if the browser cannot parse it, leaving #000
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const hex = (v) => v.toString(16).padStart(2, '0');
    out[n] = a === 255
      ? `#${hex(r)}${hex(g)}${hex(b)}`
      : `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(3)})`;
  }
  el.remove();
  return out;
}
"""


def resolve(node: pathlib.Path, tokens_css: str) -> dict[str, dict[str, str]]:
    """One headless page per theme, so light-dark() resolves each side for real."""
    if not (node / "playwright").is_dir():
        sys.exit(f"no Playwright under {node} -- npm install there, or pass --node-modules")
    runner = f"""
import {{ chromium }} from '{node / "playwright" / "index.mjs"}';
const css = {json.dumps(tokens_css)};
const out = {{}};
const b = await chromium.launch();
for (const theme of ['light', 'dark']) {{
  const p = await b.newPage();
  await p.setContent(
    `<!doctype html><html data-theme="${{theme}}"><head><style>${{css}}</style></head><body></body></html>`
  );
  out[theme] = await p.evaluate({SCRIPT}, {json.dumps(TOKENS)});
  await p.close();
}}
await b.close();
console.log(JSON.stringify(out));
"""
    # Beside node_modules, because Node resolves a bare specifier from the SCRIPT's location.
    tmp = node.parent / ".resolve-tokens.mjs"
    try:
        tmp.write_text(runner)
        proc = subprocess.run(
            ["node", str(tmp)], capture_output=True, text=True, cwd=node.parent, timeout=180
        )
    finally:
        tmp.unlink(missing_ok=True)
    if proc.returncode:
        sys.exit(f"resolver failed:\n{proc.stderr[-2000:]}")
    return json.loads(proc.stdout)


def render(resolved: dict[str, dict[str, str]], version: str) -> str:
    def block(theme: str) -> str:
        rows = "\n".join(
            f'    "{name}": "{resolved[theme][token]}",  # --{token}'
            for name, token in VUETIFY.items()
        )
        return "{\n" + rows + "\n}"

    def tokens(theme: str) -> str:
        rows = "\n".join(f'    "{k}": "{v}",' for k, v in sorted(resolved[theme].items()))
        return "{\n" + rows + "\n}"

    return (
        textwrap.dedent(f'''\
        """The KBase design tokens, resolved to concrete colours. GENERATED -- do not edit.

        Written by resolve_tokens.py from kbase-design-system {version}. Most tokens are
        `oklch(from …)` inside `light-dark()`, so only a browser can say what they are; this is that
        answer, recorded so the app does not need one at runtime.

        VUETIFY_LIGHT and VUETIFY_DARK are the subset Vuetify's own theme takes. Handing it those
        makes it generate every `--v-theme-*` triplet itself, including the derived on-colours, which
        is what gets `rgba(var(--v-theme-surface), <alpha>)` right inside components that have no
        rule of their own.

        TOKENS is every resolved token, for the few places that need a colour in Python rather than
        in CSS -- a Leaflet marker, a chart series -- where `var()` cannot reach.
        """

        VUETIFY_LIGHT = ''')
        + block("light")
        + "\n\nVUETIFY_DARK = "
        + block("dark")
        + '\n\nTOKENS = {\n    "light": '
        + tokens("light").replace("\n", "\n    ")
        + ',\n    "dark": '
        + tokens("dark").replace("\n", "\n    ")
        + ",\n}\n"
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--node-modules",
        required=True,
        type=pathlib.Path,
        help="a node_modules directory with playwright installed",
    )
    ap.add_argument(
        "--brand",
        type=pathlib.Path,
        help="a portal's brand stylesheet, appended after tokens.css so its overrides resolve too",
    )
    ap.add_argument(
        "--out",
        required=True,
        type=pathlib.Path,
        help="where to write the generated module, e.g. src/<package>/theme_colors.py",
    )
    args = ap.parse_args()

    try:
        pkg = files("kbase_design_system")
        css = (pkg / "tokens.css").read_text()
        version = getattr(__import__("importlib.metadata", fromlist=["version"]), "version")(
            "kbase-design-system"
        )
    except Exception as e:  # noqa: BLE001
        sys.exit(f"kbase-design-system is not installed: {type(e).__name__}: {e}")

    if args.brand:
        # Appended, so the override wins and every oklch(from var(--c-primary) ...) below it
        # re-derives. Without this the app would paint one primary and Vuetify's theme another.
        css += "\n" + args.brand.read_text()
    resolved = resolve(args.node_modules.expanduser().resolve(), css)
    # Vuetify's traits take a hex string, so every token feeding one has to be opaque. And a token
    # that resolved identically in both themes is the signature of a failed conversion, not of a
    # theme-invariant colour -- only the solid c-* fills are the same on both sides.
    bad = [t for t in VUETIFY.values() if not resolved["light"].get(t, "").startswith("#")]
    if bad:
        sys.exit(f"did not resolve to an opaque colour: {bad}")
    # The solid fills and the two button-weight variants are written without light-dark() in
    # tokens.css, so they are the same colour on both sides. Everything else differing is the point;
    # if it does not differ, the conversion silently produced the same wrong answer twice.
    THEME_INVARIANT = {
        "c-primary", "c-green", "c-yellow", "c-red", "c-purple", "c-teal", "c-ocean", "c-orange",
        "c-teal-btn", "c-purple-btn",
    }
    unexpected = {t for t in TOKENS if resolved["light"][t] == resolved["dark"][t]} - THEME_INVARIANT
    if unexpected:
        sys.exit(f"identical in both themes, so the conversion failed: {sorted(unexpected)}")
    out = pathlib.Path(args.out)
    out.write_text(render(resolved, version))
    print(f"resolved {len(TOKENS)} tokens x 2 themes into {out}")


if __name__ == "__main__":
    main()
