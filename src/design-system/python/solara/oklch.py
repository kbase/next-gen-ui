"""sRGB <-> OKLCh, as CSS Color 4 defines it.

tokens.css states most of the palette as `oklch(from var(--c-base) L C H)`: take a base colour into
OKLCh, replace some of its lightness, chroma and hue, and come back. That is arithmetic with one
answer, so a consumer that needs a token as a number computes it rather than asking a browser.

Gamut mapping is not implemented. Every colour this palette produces is inside sRGB, so the clamp
below never has anything to do; a palette that left the gamut would need CSS Color 4's mapping and
would differ from a browser without it.
"""

from __future__ import annotations

import math

# Linear sRGB <-> OKLab, from CSS Color 4 section 9.
_LMS = ((0.4122214708, 0.5363325363, 0.0514459929),
        (0.2119034982, 0.6806995451, 0.1073969566),
        (0.0883024619, 0.2817188376, 0.6299787005))
_LAB = ((0.2104542553, 0.7936177850, -0.0040720468),
        (1.9779984951, -2.4285922050, 0.4505937099),
        (0.0259040371, 0.7827717662, -0.8086757660))
_LMS_INV = ((1.0, 0.3963377774, 0.2158037573),
            (1.0, -0.1055613458, -0.0638541728),
            (1.0, -0.0894841775, -1.2914855480))
_RGB = ((4.0767416621, -3.3077115913, 0.2309699292),
        (-1.2684380046, 2.6097574011, -0.3413193965),
        (-0.0041960863, -0.7034186147, 1.7076147010))


def _dot(row, v):
    return sum(a * b for a, b in zip(row, v))


def _to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _to_gamma(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def to_oklch(hex_colour: str) -> tuple[float, float, float]:
    """`#rrggbb` -> (L, C, H), H in degrees."""
    h = hex_colour.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    rgb = [_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    lms = [_dot(row, rgb) ** (1 / 3) for row in _LMS]
    lightness, a, b = (_dot(row, lms) for row in _LAB)
    return lightness, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def to_hex(lightness: float, chroma: float, hue: float) -> str:
    """(L, C, H) -> `#rrggbb`."""
    a = chroma * math.cos(math.radians(hue))
    b = chroma * math.sin(math.radians(hue))
    lms = [_dot(row, (lightness, a, b)) ** 3 for row in _LMS_INV]
    return "#%02x%02x%02x" % tuple(
        max(0, min(255, round(_to_gamma(_dot(row, lms)) * 255))) for row in _RGB)
