"""theme.skin(), theme.tokens() and theme.vuetify(), imported from the installed wheel:
`pip install .` comes before `pytest`. Nothing here reads the source tree.
"""
from pathlib import Path

import pytest

from kbase_design_system.solara import theme

KBASE = ":root { --c-primary: #5e9732; }"
LEGACY = ":root { --c-primary: #0e7490; }\n.legacy-hero { background: teal; }"


@pytest.fixture
def resources(tmp_path: Path) -> Path:
    d = tmp_path / "resources"
    d.mkdir()
    (d / "kbase.css").write_text(KBASE)
    (d / "legacy.css").write_text(LEGACY)
    return d


def select(resources, requested, default="kbase"):
    return theme.skin(resources, default, requested)


def test_unset_selects_the_default(resources):
    assert select(resources, None) == theme.Skin("kbase", KBASE, None, None)


def test_a_blank_value_is_unset(resources):
    assert select(resources, "  ") == theme.Skin("kbase", KBASE, "  ", None)


def test_none_mounts_nothing(resources):
    assert select(resources, "NONE") == theme.Skin("none", "", "NONE", None)


def test_a_name_is_its_sheet_in_resources(resources):
    assert select(resources, "Legacy") == theme.Skin("legacy", LEGACY, "Legacy", None)


def test_a_path_is_read_from_the_filesystem(resources, tmp_path):
    sheet = tmp_path / "elsewhere" / "partner.css"
    sheet.parent.mkdir()
    sheet.write_text(":root { --c-primary: #66489d; }")
    active = select(resources, str(sheet))
    assert (active.name, active.css, active.note) == (str(sheet), sheet.read_text(), None)


def test_a_path_is_read_on_every_call(resources, tmp_path):
    sheet = tmp_path / "live.css"
    sheet.write_text(":root { --c-primary: #111111; }")
    first = select(resources, str(sheet)).css
    sheet.write_text(":root { --c-primary: #222222; }")
    assert first != select(resources, str(sheet)).css == sheet.read_text()


def test_an_unknown_name_falls_to_the_default_and_says_why(resources):
    active = select(resources, "partner")
    assert (active.name, active.css, active.requested) == ("kbase", KBASE, "partner")
    assert active.note == f"{resources / 'partner.css'} does not exist"


def test_an_unreadable_path_falls_to_the_default_and_says_why(resources, tmp_path):
    active = select(resources, str(tmp_path / "gone.css"))
    assert (active.name, active.css) == ("kbase", KBASE)
    assert active.note == "No such file or directory"


def test_a_missing_default_sheet_raises(resources):
    with pytest.raises(FileNotFoundError):
        select(resources, None, default="partner")
    with pytest.raises(FileNotFoundError):
        select(resources, "partner", default="also-missing")


def test_none_can_be_the_default(resources):
    assert select(resources, None, default="none") == theme.Skin("none", "", None, None)


# --- tokens ---------------------------------------------------------------------------------------

# Chromium's own numbers for the same tokens.css: each token painted as `color`, read back through
# a 1px canvas, in a page under each colour scheme. Every token agreed within one unit per channel.
BROWSER = {
    ("c-bg", "light"): "#f5f2ee", ("c-bg", "dark"): "#100c08",
    ("c-ink", "light"): "#1a1714", ("c-ink", "dark"): "#f6f3ef",
    ("bg-primary", "light"): "#e1ebf3", ("bg-primary", "dark"): "#192c3c",
    ("bgw-green", "light"): "#e4eddf", ("bgw-green", "dark"): "#293621",
    ("ct-yellow", "light"): "#8c5200", ("ct-yellow", "dark"): "#f8d13f",
    ("bo-yellow", "light"): "#ecdda4", ("bo-yellow", "dark"): "#5f4f00",
    ("c-teal-dim", "light"): "#007368", ("c-teal-dim", "dark"): "#42ac9e",
}


def channels(hex_colour):
    return tuple(int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))


@pytest.mark.parametrize("name,scheme", sorted(BROWSER))
def test_tokens_agree_with_the_browser(name, scheme):
    mine, theirs = channels(theme.tokens(scheme=scheme)[name]), channels(BROWSER[name, scheme])
    assert max(abs(a - b) for a, b in zip(mine, theirs)) <= 1


def test_tokens_cover_every_opaque_colour_token():
    families = {n for n in theme._packaged() if n.startswith(theme._COLOUR_FAMILIES)}
    translucent = {"c-border", "c-border2", "c-focus", "c-scrim"}
    assert set(theme.tokens()) == families - translucent
    assert set(theme.tokens(scheme="dark")) == families - translucent


def test_tokens_are_the_literals_the_stylesheet_states():
    light = theme.tokens()
    assert (light["c-primary"], light["c-green"], light["c-neutral"]) == ("#007dc3", "#5e9732", "#6a6158")


def test_tokens_follow_the_skin_through_the_derivation():
    base, skinned = theme.tokens(), theme.tokens(":root { --c-primary: #5e9732; }")
    assert skinned["c-primary"] == "#5e9732"
    assert skinned["ct-primary"] != base["ct-primary"]
    assert skinned["bg-primary"] != base["bg-primary"]
    assert skinned["c-red"] == base["c-red"]


def test_links_keep_their_colour_when_the_primary_moves():
    """--c-link is KBase's blue stated apart from --c-primary, so a skin's hue never reaches a
    link; --ct-link is its text tier, derived like --ct-primary."""
    base, skinned = theme.tokens(), theme.tokens(":root { --c-primary: #66489d; }")
    assert base["c-link"] == base["c-primary"] == "#007dc3"
    assert base["ct-link"] == base["ct-primary"]
    assert skinned["ct-link"] == base["ct-link"] != skinned["ct-primary"]


def test_a_skin_can_set_a_derived_token_outright():
    assert theme.tokens(":root { --c-bg: #ffffff; }")["c-bg"] == "#ffffff"


def test_a_colour_form_the_resolver_cannot_evaluate_is_an_error():
    with pytest.raises(ValueError, match="--c-primary"):
        theme.tokens(":root { --c-primary: rgb(0 125 195); }")


# --- vuetify --------------------------------------------------------------------------------------

def test_vuetify_is_thirteen_traits_per_scheme():
    palette = theme.vuetify()
    assert set(palette) == {"light", "dark"}
    for colours in palette.values():
        assert set(colours) == set(theme.VUETIFY)
        assert all(len(v) == 7 and v.startswith("#") for v in colours.values())


def test_vuetify_reads_the_same_tokens():
    for scheme in ("light", "dark"):
        resolved = theme.tokens(scheme=scheme)
        assert theme.vuetify()[scheme] == {t: resolved[n] for t, n in theme.VUETIFY.items()}


def test_vuetify_follows_the_skin():
    palette = theme.vuetify(":root { --c-primary: #5e9732; }")
    assert palette["light"]["primary"] == palette["dark"]["primary"] == "#5e9732"
    assert palette["light"]["primary_darken_1"] != theme.vuetify()["light"]["primary_darken_1"]
