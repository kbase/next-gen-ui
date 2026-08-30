"""Vuetify's theme, resolved from tokens.css.

Solara renders its widgets with Vuetify, which holds its theme as comma-separated RGB triplets and
consumes them as `rgba(var(--v-theme-surface), <alpha>)`. CSS cannot decompose a colour into three
numbers, so the theme is set from Python: ipyvuetify's ThemeColors traits sync to the front end, and
Vuetify generates every `--v-theme-*` variable itself, including the on-colours it derives by
contrast. That is what makes the alpha blends inside components no stylesheet mentions resolve to
this palette rather than Material's.

    from kbase_design_system.solara import theme
    for scheme, colours in theme.vuetify("#66489d").items():
        target = getattr(solara.lab.theme.themes, scheme)
        for trait, value in colours.items():
            setattr(target, trait, value)

tokens.css states the palette as `oklch(from var(--c-base) L C H)`, which is arithmetic with one
answer (see oklch.py), so this reads the stylesheet the wheel already carries and computes. Nothing
is generated and no browser is involved.

The brand is passed in rather than read from a stylesheet: a portal states it in its own brand.css,
and this has no way to know which file that is.
"""

from __future__ import annotations

import functools
import re
from importlib.resources import files

from . import oklch

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

_DECL = re.compile(r"--([a-z0-9-]+)\s*:\s*([^;]+);", re.S)
_LIGHT_DARK = re.compile(r"light-dark\(\s*(.+?)\s*,\s*(.+?)\s*\)", re.S)
# A channel is `calc(...)`, which carries spaces, or one bare token.
_CHANNEL = r"(?:calc\([^)]*\)|[^\s)]+)"
_OKLCH = re.compile(
    rf"oklch\(\s*from\s+var\(--([a-z0-9-]+)\)\s+({_CHANNEL})\s+({_CHANNEL})\s+h\s*\)", re.S)


@functools.lru_cache(maxsize=1)
def _declarations() -> dict[str, str]:
    """Every custom property in tokens.css, as written. A later declaration wins, as in the
    cascade. Read once: the file ships in the wheel and does not change under a running process."""
    css = (files("kbase_design_system") / "tokens.css").read_text()
    return {name: " ".join(value.split()) for name, value in _DECL.findall(css)}


def _channel(spec: str, chroma: float) -> float:
    """A lightness or chroma slot: a number, `c`, or `calc(c * n)`."""
    if spec == "c":
        return chroma
    calc = re.fullmatch(r"calc\(\s*c\s*\*\s*([\d.]+)\s*\)", spec)
    if calc:
        return chroma * float(calc.group(1))
    try:
        return float(spec)
    except ValueError:
        raise ValueError(f"tokens.css: unsupported oklch channel {spec!r}")


def _oklch_of(name: str, scheme: str, brand: str) -> tuple[float, float, float]:
    """One token, in one scheme, as (L, C, H).

    A derivation can name a token that is itself derived -- --c-teal-dim reads --c-teal-btn, which
    reads --c-teal -- so the chain stays in OKLCh and quantises once, at the end. Rounding to eight
    bits per hop moves the last colours in a chain by a unit.
    """
    if name == "c-primary":
        return oklch.to_oklch(brand)
    value = _declarations().get(name)
    if value is None:
        raise ValueError(f"tokens.css declares no --{name}")
    branch = _LIGHT_DARK.fullmatch(value)
    if branch:
        value = branch.group(1 if scheme == "light" else 2)
    if value.startswith("#"):
        return oklch.to_oklch(value)
    m = _OKLCH.fullmatch(value)
    if not m:
        raise ValueError(f"tokens.css: unsupported value for --{name}: {value!r}")
    base, lightness, chroma = m.groups()
    _, base_c, base_h = _oklch_of(base, scheme, brand)
    return _channel(lightness, base_c), _channel(chroma, base_c), base_h


def vuetify(brand: str) -> dict[str, dict[str, str]]:
    """The thirteen traits ipyvuetify syncs, keyed by scheme, for a portal whose --c-primary is
    `brand`. `brand` is a hex colour; every primary-family token derives from it."""
    return {
        scheme: {trait: oklch.to_hex(*_oklch_of(token, scheme, brand))
                 for trait, token in VUETIFY.items()}
        for scheme in ("light", "dark")
    }
