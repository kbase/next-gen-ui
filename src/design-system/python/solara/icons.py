"""Phosphor icons, from the family's own webfont.

The design system draws with Phosphor and states the rule for choosing one: "One icon per meaning,
across the system. Look a meaning up here before choosing an icon: two meanings sharing an icon
makes the whole set unreadable." Weight carries meaning too -- regular for chrome, bold for
emphasis, fill for active state -- and the components are specific about which: a Chip's glyph is
bold at 9px, an Alert's is bold at 16.

WHY A FONT AND NOT FILES. Phosphor ships as npm packages, and a Solara portal has no bundler to
consume one. Copying the SVGs out of @phosphor-icons/react works, but it keeps someone else's art
in a KBase repo and needs a script, a checkout with npm install, and a version manifest to stay
current. @phosphor-icons/web is the same art as a webfont: vuetify.css imports one stylesheet per
weight, and this builds the two class names that select a glyph. The cost is stated where the
import is -- a deployment that cannot reach the CDN has no icons rather than a fallback.

The KBase mark below is NOT Phosphor -- it is three circles from the design system's own logo, and
it stays inline SVG so it is always there and always takes the tokens.
"""
from __future__ import annotations

import re

# Default box for an icon that labels something. Overridden per call site where the design system
# is explicit: a chip's icon is 9, a button's is 14, a card's head is larger.
SIZE = 16

# The font selects a glyph with two classes: the weight, then the name.
_WEIGHT = {"regular": "ph", "bold": "ph-bold", "fill": "ph-fill"}


def _kebab(name: str) -> str:
    """TreeStructure -> tree-structure, the name the font uses."""
    return re.sub(r"(?<!^)(?=[A-Z])", "-", name).lower()


def glyph(name: str, size: int | str = SIZE, cls: str = "", weight: str = "regular") -> str:
    """One icon, for HTML a portal builds by hand.

    `size` may be a number of pixels or any CSS length -- "1em" ties the glyph to the text it sits
    in, which is what a run of prose wants. The font renders at font-size, so that is all it takes.
    """
    px = f"{size}px" if isinstance(size, int) else size
    klass = f"{_WEIGHT.get(weight, 'ph')} ph-{_kebab(name)}" + (f" {cls}" if cls else "")
    return (f"<i class=\"{klass}\" aria-hidden=\"true\" "
            f"style=\"font-size:{px};line-height:1;flex:0 0 auto;vertical-align:-0.125em\"></i>")


def children(name: str, label: str = "", size: int | str = 14, weight: str = "regular") -> list:
    """An icon, and optionally a label beside it, as children for a Solara component."""
    import solara

    out = [solara.HTML(tag="span", unsafe_innerHTML=glyph(name, size, weight=weight),
                       style={"display": "inline-flex"})]
    if label:
        out.append(f" {label}")
    return out


# The design system's status glyphs, from Section 10's table, which also records what each one does
# NOT mean: X closes and XCircle errors; Warning needs attention and is not a failure; Hourglass
# waits and Clock is scheduled. A state names itself from here so no two states share a shape.
STATUS = {
    "done": "Check",            # confirmed, inline done -- a finished job is CheckCircle
    "complete": "CheckCircle",  # complete, succeeded
    "close": "X",               # close, dismiss, clear
    "error": "XCircle",         # error, failed
    "warning": "Warning",       # needs attention -- not an error
    "blocked": "Prohibit",      # blocked, not permitted, canceled
    "active": "Circle",         # active (fill weight)
    "pending": "Circle",        # pending (bold weight)
    "indeterminate": "CircleDashed",
    "waiting": "Hourglass",     # waiting -- elapsed time is Clock
    "locked": "Lock",           # locked, private
    "collapsed": "CaretRight",
    "expanded": "CaretDown",
    "copy": "Copy",
    "external": "ArrowSquareOut",
    "download": "DownloadSimple",
    "share": "ShareNetwork",
    "add": "Plus",
}


def kbase_mark(size: int = 20, animate: bool = False, label: str = "") -> str:
    """KBase's three circles -- and, when `animate`, the design system's only spinner.

    These are one thing, not two. The design system draws the mark in four places (its own masthead
    and footer, the app shell's rail, the in-context mock), always as three circles on a 34x28 box in
    --c-yellow, --c-grellow and --c-ocean. Loader.module.scss then says outright that its rest
    positions ARE that row: "with animation off the loader is the static logo". So an app that owns
    the mark already owns the spinner, and the braid is the mark working rather than a second
    graphic that happens to be nearby.

    Colours come from the tokens rather than the hex in favicon.svg, so the mark follows the theme --
    and follows a portal's own palette if it sets one via data-brand.

    `label` makes it an announced region; leave it empty where the mark is decoration beside the
    word "KBase", which is already there to read.
    """
    # 0 0 48 48 when it moves, because the braid swings the dots outside the tight box; the still
    # mark uses the design system's own 34x28 so it sits at the proportions the four call sites do.
    box, dots = ((0, 0, 48, 48), ((13, 24, 9), (24, 24, 9), (35, 24, 9))) if animate else (
        (0, 0, 34, 28), ((7, 14, 8), (17, 14, 8), (27, 14, 8)))
    w = round(size * (box[2] / box[3]))
    circles = "".join(
        f"<circle cx='{cx}' cy='{cy}' r='{r}' fill='var(--c-{hue})' opacity='0.85'/>"
        for (cx, cy, r), hue in zip(dots, ("yellow", "grellow", "ocean")))
    role = f" role='status' aria-label='{label}'" if label else ""
    return (f"<span class='kb-mark{' kb-loader' if animate else ''}'{role}>"
            f"<svg viewBox='{box[0]} {box[1]} {box[2]} {box[3]}' width='{w}' height='{size}' "
            f"aria-hidden='true'>{circles}</svg></span>")


def loader(size: int = 32, label: str = "Loading") -> str:
    """The mark, braiding. Reached for when a duration is unknown; a known one is a Progress bar,
    and the system has no indeterminate bar at all."""
    return kbase_mark(size, animate=True, label=label)


# The style an icon and its label sit in. Baseline alignment reads wrong when the glyph is nearly as
# tall as the text, so the pair is centred on a flex line instead.
CSS = """
.kb-icon-label { display:inline-flex; align-items:center; gap:var(--s-2); }
.kb-icon-label > span { display:inline-flex; }
.v-btn .kb-icon-label, .v-btn__content { gap:var(--s-2); }
"""
