"""Vuetify's theme, resolved from tokens.css and a skin.

Solara renders its widgets with Vuetify, which holds its theme as comma-separated RGB triplets and
consumes them as `rgba(var(--v-theme-surface), <alpha>)`. CSS cannot decompose a colour into three
numbers, so the theme is set from Python: ipyvuetify's ThemeColors traits sync to the front end, and
Vuetify generates every `--v-theme-*` variable itself, including the on-colours it derives by
contrast. That is what makes the alpha blends inside components no stylesheet mentions resolve to
this palette rather than Material's.

    from kbase_design_system.solara import theme
    for scheme, colours in theme.vuetify(skin_css).items():
        target = getattr(solara.lab.theme.themes, scheme)
        for trait, value in colours.items():
            setattr(target, trait, value)

`skin_css` is a portal's skin -- a stylesheet of token overrides carrying whatever brand it
expresses, the same string it loads into the page. Its declarations land on top of tokens.css
exactly as the cascade would place them, so a skin that moves the ground, the ink ramp or a semantic
colour moves the widgets with it. Called with nothing, the palette is the package's own.

tokens.css states most of the palette as `oklch(from var(--c-base) L C H)`, which is arithmetic with
one answer (see oklch.py), so this reads the stylesheets and computes. Nothing is generated and no
browser is involved.
"""

from __future__ import annotations

import functools
import re
from importlib.resources import files

import tinycss2

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

_LIGHT_DARK = re.compile(r"light-dark\(\s*(.+?)\s*,\s*(.+?)\s*\)", re.S)
# A channel is `calc(...)`, which carries spaces, or one bare token.
_CHANNEL = r"(?:calc\([^)]*\)|[^\s)]+)"
_OKLCH = re.compile(
    rf"oklch\(\s*from\s+var\(\s*--([a-z0-9-]+)\s*\)\s+({_CHANNEL})\s+({_CHANNEL})\s+h\s*\)", re.S)


def _custom_properties(css: str) -> dict[str, str]:
    """Every custom property a stylesheet sets on the root element, keyed without its `--`.

    A later declaration wins, as it does between two rules of equal specificity. Only rules whose
    selector names `:root` are read, and the attribute in `:root[data-skin='x']` is not matched:
    a file holding two skins would collapse them into each other.
    """
    out: dict[str, str] = {}
    for rule in tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True):
        if rule.type != "qualified-rule" or ":root" not in tinycss2.serialize(rule.prelude):
            continue
        for decl in tinycss2.parse_blocks_contents(
                rule.content, skip_comments=True, skip_whitespace=True):
            if decl.type == "declaration" and decl.name.startswith("--"):
                out[decl.name[2:]] = tinycss2.serialize(decl.value).strip()
    return out


@functools.lru_cache(maxsize=1)
def _packaged() -> dict[str, str]:
    """tokens.css as it ships. Read once: the file is in the wheel and does not change under a
    running process."""
    return _custom_properties((files("kbase_design_system") / "tokens.css").read_text())


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
        raise ValueError(f"unsupported oklch channel {spec!r}")


def _oklch_of(name: str, scheme: str, tokens: dict[str, str]) -> tuple[float, float, float]:
    """One token, in one scheme, as (L, C, H).

    A derivation can name a token that is itself derived -- --c-teal-dim reads --c-teal-btn, which
    reads --c-teal -- so the chain stays in OKLCh and quantises once, at the end. Rounding to eight
    bits per hop moves the last colours in a chain by a unit.
    """
    value = tokens.get(name)
    if value is None:
        raise ValueError(f"no --{name} in the tokens or the skin")
    branch = _LIGHT_DARK.fullmatch(value)
    if branch:
        value = branch.group(1 if scheme == "light" else 2)
    if value.startswith("#"):
        return oklch.to_oklch(value)
    m = _OKLCH.fullmatch(value)
    if not m:
        raise ValueError(f"unsupported value for --{name}: {value!r}")
    base, lightness, chroma = m.groups()
    _, base_c, base_h = _oklch_of(base, scheme, tokens)
    return _channel(lightness, base_c), _channel(chroma, base_c), base_h


def vuetify(skin_css: str = "") -> dict[str, dict[str, str]]:
    """The thirteen traits ipyvuetify syncs, keyed by scheme.

    `skin_css` is a skin stylesheet's text, whose declarations override the packaged tokens. Omit
    it for the design system's own palette.
    """
    tokens = dict(_packaged())
    if skin_css:
        tokens.update(_custom_properties(skin_css))
    return {
        scheme: {trait: oklch.to_hex(*_oklch_of(token, scheme, tokens))
                 for trait, token in VUETIFY.items()}
        for scheme in ("light", "dark")
    }
