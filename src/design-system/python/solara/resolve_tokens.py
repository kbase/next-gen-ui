"""Resolve the KBase design tokens to concrete colours, one set per theme.

Vuetify holds its theme as comma-separated RGB triplets, consumed as
`rgba(var(--v-theme-surface), <alpha>)`. Setting those from Python makes Vuetify generate every
`--v-theme-*` variable itself, including the derived `on-*` colours, which is what the
alpha-modulated rules inside unstyled components resolve against.

That needs concrete colours, and most tokens are not concrete: they are `oklch(from ...)` inside
`light-dark()`, computed by the browser against whichever scheme is in use. The literal ones are a
minority and everything else derives from them, so a browser resolves the set once and the result
is written to a module:

    python python/solara/resolve_tokens.py --node-modules <a checkout>/node_modules \\
        --brand <the portal's brand.css> --out src/<portal>/theme_colors.py

The output belongs to the caller, because --brand is per-portal and so are the resolved values.

Requires Playwright (any node_modules that has it) and the kbase-design-system package, which is
where tokens.css is read from, so the resolved values match the installed version.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
import textwrap
from importlib.resources import files

# Every token a portal or the Vuetify theme mapping reads. Resolved for both themes.
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

# Vuetify's ThemeColors traits, and the token each takes. accent and anchor are ColorNotAvailable
# in Vuetify 3. warning is orange rather than yellow, because yellow is the one fill that cannot
# carry white text and Vuetify picks the on-colour by contrast.
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

# Reads the tokens off a probe element, where light-dark() resolves, and converts through a canvas
# rather than by parsing the computed string: Chrome reports an oklch() token as
# `oklch(0.96 0.003 67.3)`, and reading three numbers out of that gives the wrong colour, where the
# canvas converts colour spaces properly. Alpha is kept, because --c-focus and --c-scrim have it.
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
    ctx.fillStyle = used;               // ignored if the browser cannot parse it, which leaves #000
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
    """One headless page per theme, so light-dark() resolves each side."""
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
    # Beside node_modules rather than in a temp dir: playwright's own imports are bare specifiers,
    # and Node resolves those by walking up from the importing file.
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
    """The generated module: the Vuetify subset per theme, then every token."""

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
        `oklch(from ...)` inside `light-dark()`, so only a browser can resolve them; these are the
        values it reported, recorded so that no browser is needed at runtime.

        VUETIFY_LIGHT and VUETIFY_DARK are the subset Vuetify's theme takes. Handing it those makes
        it generate every `--v-theme-*` triplet, including the derived on-colours, which is what
        `rgba(var(--v-theme-surface), <alpha>)` resolves against inside components that have no rule
        of their own.

        TOKENS is every resolved token, for the places that need a colour in Python rather than in
        CSS -- a Leaflet marker, a chart series -- where `var()` cannot reach.
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
        # re-derives. Without it the portal paints one primary and Vuetify's theme another.
        css += "\n" + args.brand.read_text()
    resolved = resolve(args.node_modules.expanduser().resolve(), css)
    # Vuetify's traits take a hex string, so every token feeding one has to be opaque. The
    # light set stands in for both, since the tokens behind these traits are opaque either way.
    bad = [t for t in VUETIFY.values() if not resolved["light"].get(t, "").startswith("#")]
    if bad:
        sys.exit(f"did not resolve to an opaque colour: {bad}")
    # The solid fills and the two button-weight variants are written without light-dark() in
    # tokens.css, so they are the same colour in both themes. Any other token that comes out
    # identical means the conversion failed and returned the same wrong answer twice.
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
