"""Vuetify's theme, for a portal that has set a brand.

Solara renders its widgets with Vuetify, which holds its theme as comma-separated RGB triplets and
consumes them as `rgba(var(--v-theme-surface), <alpha>)`. CSS cannot decompose a colour into three
numbers, so the theme is set from Python: ipyvuetify's ThemeColors traits sync to the front end, and
Vuetify then generates every `--v-theme-*` variable itself, including the on-colours it derives by
contrast. That is what makes the alpha blends inside components no stylesheet mentions resolve to
this palette rather than Material's.

Ten of the thirteen traits derive from --c-neutral or from a literal hue and are the same for every
portal, so the wheel build resolves them once. Three follow the portal's own --c-primary: two are
that colour, and the third is one derivation from it.

    from kbase_design_system.solara import theme
    for scheme, colours in theme.vuetify("#66489d").items():
        target = getattr(solara.lab.theme.themes, scheme)
        for trait, value in colours.items():
            setattr(target, trait, value)

The brand is passed in rather than read from a stylesheet: a portal states it in its own brand.css,
and this has no way to know which file that is.
"""

from __future__ import annotations

from . import oklch
from ._theme_tokens import DARK, DIM, LIGHT


def vuetify(brand: str) -> dict[str, dict[str, str]]:
    """The thirteen traits ipyvuetify syncs, keyed by scheme, for a portal whose --c-primary is
    `brand`. `brand` is a hex colour; the light and dark sets differ in every trait but this one."""
    _, chroma, hue = oklch.to_oklch(brand)
    out = {}
    for scheme, shared in (("light", LIGHT), ("dark", DARK)):
        lightness, factor = DIM[scheme]
        out[scheme] = {
            **shared,
            "primary": brand,
            "info": brand,
            "primary_darken_1": oklch.to_hex(lightness, chroma * factor, hue),
        }
    return out
