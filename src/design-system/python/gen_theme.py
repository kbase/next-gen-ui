#!/usr/bin/env python3
"""Resolve tokens.css into the numbers Vuetify's theme takes.

    python python/gen_theme.py --out <path>

Vuetify holds its theme as comma-separated RGB triplets, consumed as
`rgba(var(--v-theme-surface), <alpha>)`. CSS cannot decompose a colour into three numbers, so the
theme is set from Python and Vuetify generates every `--v-theme-*` variable itself, including the
on-colours it derives by contrast. That is what makes the alpha blends inside components no
stylesheet mentions come out right.

Most of the palette is `oklch(from var(--c-base) L C H)`, which is arithmetic (see solara/oklch.py),
so this reads tokens.css and computes. Ten of the thirteen traits derive from --c-neutral or from a
literal hue and are the same for every portal, so they are resolved here, once, during the wheel
build. The other three follow the portal's own --c-primary and are computed by solara.theme.vuetify()
from the brand it is handed.

Only the expressions the thirteen traits need are parsed: `light-dark(a, b)`, a hex literal, and
`oklch(from var(--x) L C h)` where L and C are a number, `c`, or `calc(c * n)`. Anything else raises,
rather than resolving to a colour nobody chose.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
TOKENS_CSS = HERE.parent / "tokens.css"

sys.path.insert(0, str(HERE / "solara"))
import oklch  # noqa: E402

# The traits ipyvuetify syncs, and the token each takes. accent and anchor are ColorNotAvailable in
# Vuetify 3. warning is orange rather than yellow, because yellow is the one fill that cannot carry
# white text and Vuetify picks the on-colour by contrast.
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
    "error": "c-red",
    "info": "c-primary",
    "warning": "c-orange",
}

# Follow the portal's --c-primary, so they are not resolved here.
BRANDED = {"c-primary", "c-primary-dim"}

DECL = re.compile(r"--([a-z0-9-]+)\s*:\s*([^;]+);", re.S)
# A channel is `calc(...)`, which carries spaces, or one bare token.
_CHANNEL = r"(?:calc\([^)]*\)|[^\s)]+)"
OKLCH = re.compile(
    rf"oklch\(\s*from\s+var\(--([a-z0-9-]+)\)\s+({_CHANNEL})\s+({_CHANNEL})\s+h\s*\)", re.S)


def declarations(css: str) -> dict[str, str]:
    """Every custom property, as written. A later declaration wins, as in the cascade."""
    return {name: " ".join(value.split()) for name, value in DECL.findall(css)}


def _channel(spec: str, chroma: float) -> float:
    """A lightness or chroma slot: a number, `c`, or `calc(c * n)`."""
    spec = spec.strip()
    if spec == "c":
        return chroma
    calc = re.fullmatch(r"calc\(\s*c\s*\*\s*([\d.]+)\s*\)", spec)
    if calc:
        return chroma * float(calc.group(1))
    try:
        return float(spec)
    except ValueError:
        raise SystemExit(f"gen_theme: unsupported oklch channel {spec!r}")


def _resolve_oklch(name: str, decls: dict[str, str], scheme: str) -> tuple[float, float, float]:
    """One token, in one scheme, as (L, C, H).

    A derivation can name a token that is itself derived -- --c-teal-dim reads --c-teal-btn, which
    reads --c-teal -- so the chain stays in OKLCh and quantises once, at the end. Rounding to eight
    bits per hop moves the last two colours in the chain by a unit.
    """
    value = decls.get(name)
    if value is None:
        raise SystemExit(f"gen_theme: tokens.css declares no --{name}")
    branch = re.fullmatch(r"light-dark\(\s*(.+?)\s*,\s*(.+?)\s*\)", value, re.S)
    if branch:
        value = branch.group(1 if scheme == "light" else 2)
    if value.startswith("#"):
        return oklch.to_oklch(value)
    m = OKLCH.fullmatch(value)
    if not m:
        raise SystemExit(f"gen_theme: unsupported value for --{name}: {value!r}")
    base, lightness, chroma = m.group(1), m.group(2), m.group(3)
    _, base_c, base_h = _resolve_oklch(base, decls, scheme)
    return _channel(lightness, base_c), _channel(chroma, base_c), base_h


def resolve(name: str, decls: dict[str, str], scheme: str) -> str:
    """One token, in one scheme, as `#rrggbb`."""
    return oklch.to_hex(*_resolve_oklch(name, decls, scheme))


def brand_dim(decls: dict[str, str]) -> dict[str, tuple[float, float]]:
    """--c-primary-dim's own lightness and chroma factor, per scheme.

    The one branded trait that is not --c-primary itself. Read from tokens.css rather than restated
    in theme.py, so the formula has one home.
    """
    value = decls["c-primary-dim"]
    branch = re.fullmatch(r"light-dark\(\s*(.+?)\s*,\s*(.+?)\s*\)", value, re.S)
    if not branch:
        raise SystemExit(f"gen_theme: --c-primary-dim is not a light-dark pair: {value!r}")
    out = {}
    for scheme, side in (("light", branch.group(1)), ("dark", branch.group(2))):
        m = OKLCH.fullmatch(side.strip())
        if not m or m.group(1) != "c-primary":
            raise SystemExit(f"gen_theme: --c-primary-dim {scheme} does not derive from "
                             f"--c-primary: {side!r}")
        # chroma as a factor of the base's, which is what _channel applies
        out[scheme] = (_channel(m.group(2), 1.0), _channel(m.group(3), 1.0))
    return out


def build() -> str:
    decls = declarations(TOKENS_CSS.read_text())
    out = [
        '"""The design tokens Vuetify\'s theme takes, resolved. GENERATED -- do not edit.\n',
        "Written by python/gen_theme.py from tokens.css during the wheel build. Vuetify holds its",
        "theme as RGB triplets and generates every --v-theme-* variable from what it is handed, so",
        "these are the numbers that make the alpha blends inside unstyled components resolve.\n",
        "LIGHT and DARK are the traits no portal changes. primary and info are a portal's own",
        "--c-primary, and DIM carries --c-primary-dim's lightness and chroma factor so that one can",
        "be computed from it. solara.theme.vuetify() puts the three together.",
        '"""\n',
    ]
    for scheme in ("light", "dark"):
        out.append(f"{scheme.upper()} = {{")
        for trait, token in VUETIFY.items():
            if token in BRANDED:
                continue
            out.append(f'    "{trait}": "{resolve(token, decls, scheme)}",  # --{token}')
        out.append("}\n")
    dim = brand_dim(decls)
    out.append("# --c-primary-dim: (lightness, chroma as a factor of the brand's)")
    out.append("DIM = {")
    for scheme, (lightness, chroma) in dim.items():
        out.append(f'    "{scheme}": ({lightness}, {chroma}),')
    out.append("}")
    return "\n".join(out)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", type=pathlib.Path, required=True)
    args = ap.parse_args(argv)
    text = build()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text)
    print(f"{args.out}: {len(VUETIFY) - len(BRANDED)} traits x 2 schemes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
