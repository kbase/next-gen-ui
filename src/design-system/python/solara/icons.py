"""Phosphor glyphs and the KBase mark, as HTML strings.

A glyph is an `<i>` carrying two classes, the weight and the name:
`ph-bold ph-tree-structure`. Weight is part of the meaning -- regular for
chrome, bold for emphasis, fill for an active state -- so it is a parameter
rather than a constant.

The glyphs come from @phosphor-icons/web, a webfont, because Phosphor's other
distributions are npm packages and a Solara portal has no bundler to build one.
vuetify.css imports one stylesheet per weight from a CDN, so a deployment that
cannot reach unpkg.com renders no icons. Vendoring the SVGs out of
@phosphor-icons/react instead would need a checkout, a script and a version
manifest to track the upstream release.

kbase_mark() is drawn here as inline SVG, so it needs no network, and filled
from the colour tokens, so it follows the theme.
"""
from __future__ import annotations

import re

# The box for an icon that labels something. Overridden where the design system gives a size:
# a chip's glyph is 9px, a button's 14.
SIZE = 16

# The font selects a glyph with two classes: the weight, then the name.
_WEIGHT = {"regular": "ph", "bold": "ph-bold", "fill": "ph-fill"}


def _kebab(name: str) -> str:
    """TreeStructure -> tree-structure, the name the font uses."""
    return re.sub(r"(?<!^)(?=[A-Z])", "-", name).lower()


def glyph(name: str, size: int | str = SIZE, cls: str = "", weight: str = "regular") -> str:
    """One icon, for HTML a portal builds by hand.

    `size` is pixels as an int, or any CSS length as a string. The font renders at font-size, so
    "1em" sizes the glyph from the text around it.

    The inline style is what a stylesheet cannot reach: an icon font sits on the text baseline, so
    a glyph beside a word rides high without the -0.125em shift.
    """
    px = f"{size}px" if isinstance(size, int) else size
    klass = f"{_WEIGHT.get(weight, 'ph')} ph-{_kebab(name)}" + (f" {cls}" if cls else "")
    return (f"<i class=\"{klass}\" aria-hidden=\"true\" "
            f"style=\"font-size:{px};line-height:1;flex:0 0 auto;vertical-align:-0.125em\"></i>")


def children(name: str, label: str = "", size: int | str = 14, weight: str = "regular") -> list:
    """An icon, and optionally a label beside it, as children for a Solara component.

    solara is imported here rather than at module scope, so the rest of the module works without
    it: kbase-design-system does not depend on Solara, and glyph() and kbase_mark() return strings
    any consumer can use. The packaging check imports this module into a bare venv.
    """
    import solara

    out = [solara.HTML(tag="span", unsafe_innerHTML=glyph(name, size, weight=weight),
                       style={"display": "inline-flex"})]
    if label:
        out.append(f" {label}")
    return out


# The design system's status glyphs, from Section 10's table, which draws the distinctions this
# map preserves: X closes where XCircle errors, Warning asks for attention where XCircle reports a
# failure, Hourglass waits where Clock shows elapsed time. Two states share Circle and are told
# apart by weight, which is why the weight is noted against them; every other state has a shape to
# itself, and naming a state from here is what keeps that true.
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
    """The KBase mark: three circles, as inline SVG.

    With `animate`, the same circles at the coordinates and under the classes Loader.tsx uses, so
    components.css animates them. Mark and loader are one graphic in this design system: Loader's
    rest positions are the logo row.

    Circles are filled from --c-yellow, --c-grellow and --c-ocean rather than the hex in
    favicon.svg, so the mark follows the theme, and any palette a portal sets through data-brand.

    `size` is the height. Width follows the aspect ratio of the box, so the static mark is wider
    than it is tall and the animated one is square. Circles carry the 0.85 opacity Loader sets, so
    the two composite the way the favicon does.

    `label` makes the mark an announced region. Leave it empty beside the word "KBase", which a
    screen reader already reaches.
    """
    # 0 0 48 48 when it moves, because the keyframes translate the dots past the edges of the
    # 34x28 box the design system draws the static mark on.
    box, dots = ((0, 0, 48, 48), ((13, 24, 9), (24, 24, 9), (35, 24, 9))) if animate else (
        (0, 0, 34, 28), ((7, 14, 8), (17, 14, 8), (27, 14, 8)))
    w = round(size * (box[2] / box[3]))
    circles = "".join(
        f"<circle cx='{cx}' cy='{cy}' r='{r}' fill='var(--c-{hue})' opacity='0.85'/>"
        for (cx, cy, r), hue in zip(dots, ("yellow", "grellow", "ocean")))
    role = f" role='status' aria-label='{label}'" if label else ""
    # components.css puts the braid on .kb-loader--loader and holds it at animation-play-state:
    # paused until the same element carries [data-active]. Loader.tsx sets both on the <svg> and
    # .kb-loader on the <span> around it, which is also where the --loader-* custom properties
    # the keyframes read are declared.
    span_cls = "kb-mark kb-loader" if animate else "kb-mark"
    svg_cls = " class='kb-loader--loader' data-active" if animate else ""
    return (f"<span class='{span_cls}'{role}>"
            f"<svg{svg_cls} viewBox='{box[0]} {box[1]} {box[2]} {box[3]}' "
            f"width='{w}' height='{size}' aria-hidden='true'>{circles}</svg></span>")


def loader(size: int = 32, label: str = "Loading") -> str:
    """The mark, animated. For work of unknown duration; work of known duration is a Progress bar,
    and this design system has no indeterminate bar."""
    return kbase_mark(size, animate=True, label=label)


# The style an icon and its label sit in. A glyph is nearly as tall as the text beside it, so the
# pair is centred on a flex line rather than aligned on the baseline. The third rule repeats the
# gap for a Vuetify button, which lays its own content out.
CSS = """
.kb-icon-label { display:inline-flex; align-items:center; gap:var(--s-2); }
.kb-icon-label > span { display:inline-flex; }
.v-btn .kb-icon-label, .v-btn__content { gap:var(--s-2); }
"""
