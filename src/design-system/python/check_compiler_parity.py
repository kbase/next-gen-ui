#!/usr/bin/env python3
"""Do the two Sass compilers still agree?

The wheel is compiled by the Dart Sass that pip can install everywhere, which
is 1.51.0 (see find_sass()). The React bundle is compiled by the `sass` in
package.json, currently 1.99.0. Those are the same program at different ages,
and the whole pipeline rests on them producing the same CSS -- if they ever
diverge, a portal starts looking subtly unlike the showcase and nothing says
so.

This compiles the components both ways and compares. It normalises three things
that are known to differ and cannot reach a pixel:

  * where a comment lands, and comments themselves
  * ' versus " in attribute selectors
  * a rule with no declarations, which 1.99 emits to park an orphan comment

Anything left is a real difference, and the first one will almost certainly be
a Sass feature added after 1.51 appearing in a .module.scss. The fix is then a
choice -- rewrite that line, or find a newer Dart Sass that pip can install on
macOS -- not something to paper over here.

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

sys.path.insert(0, str(HERE))
import gen_portal_css  # noqa: E402

COMMENT = re.compile(r"/\*.*?\*/", re.S)
EMPTY_RULE = re.compile(r"^[^{}]*\{\s*\}\s*$", re.M)


def normalise(css: str) -> list[str]:
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
