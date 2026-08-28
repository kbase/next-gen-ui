"""Check that the two Sass compilers produce the same CSS.

The wheel is compiled by the Dart Sass pip can install everywhere, 1.51.0 (see
find_sass()). The React bundle is compiled by the `sass` in package.json,
currently 1.99.0. The pipeline depends on those agreeing.

Three differences between them cannot affect rendering and are normalised away
before comparing:

  * comments, and which line they land on
  * ' versus " in attribute selectors
  * rules with no declarations, which 1.99 emits to hold an orphan comment

Anything else is a real difference, most likely a Sass feature newer than 1.51
appearing in a .module.scss. Resolving that is a choice between rewriting the
line and finding a newer Dart Sass that pip can install on macOS, so this
reports the difference rather than absorbing it.

    python python/check_compiler_parity.py --sass node_modules/.bin/sass
"""

from __future__ import annotations

import argparse
import difflib
import pathlib
import re
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent

# The generator sits beside this file, which is not on sys.path when the script is run by path.
sys.path.insert(0, str(HERE))
import gen_portal_css  # noqa: E402

COMMENT = re.compile(r"/\*.*?\*/", re.S)
# `\s` spans newlines, so this matches a rule left empty across two lines once its comment is gone.
EMPTY_RULE = re.compile(r"^[^{}]*\{\s*\}\s*$", re.M)


def normalise(css: str) -> list[str]:
    """Remove the three differences listed above: comments and quote style, then the rules the
    comments left empty, then the line a declaration happens to sit on."""
    css = COMMENT.sub("", css).replace('"', "'")
    css = EMPTY_RULE.sub("", css)
    return [" ".join(line.split()) for line in css.splitlines() if line.strip()]


def build(out: pathlib.Path, sass: str | None) -> list[str]:
    argv = ["--out", str(out)]
    if sass:
        argv += ["--sass", sass]
    if gen_portal_css.main(argv):
        raise SystemExit("compile failed")
    return normalise(out.read_text())


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--sass", default="node_modules/.bin/sass",
                    help="the Sass package.json pins; the pip one is found automatically")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as td:
        td = pathlib.Path(td)
        pinned = build(td / "pinned.css", args.sass)
        shipped = build(td / "shipped.css", None)

    if pinned == shipped:
        print(f"the two compilers agree: {len(shipped)} significant lines")
        return 0

    print("the compilers no longer agree:", file=sys.stderr)
    for line in list(difflib.unified_diff(pinned, shipped, "package.json", "wheel", lineterm=""))[:60]:
        print("  " + line, file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
