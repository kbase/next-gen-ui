#!/usr/bin/env python3
"""Join the loader's pose math to its DOM driver, as one script a page can run.

    python python/gen_loader_js.py --out <path>

components/Loader/pose.js holds the math, and Loader.tsx imports it. A page with no React gets
python/loader_driver.js, which imports the same file. Neither module system survives the trip: the
script reaches a page as text inside a <script> element, where there is no bundler and no import
map. So the two are concatenated in source order and wrapped in a function, which is what `import`
and `export` were doing between them.

Both files are authored for this: every import in the driver names pose.js, and every export in
pose.js is a declaration at column 0. Anything else raises, rather than shipping a script whose
missing pieces would show only as a loader that does not move.

The driver sits in python/ with the other build inputs rather than in python/solara/, which
pyproject.toml force-includes whole -- an ES module in the wheel is dead weight whose import would
fail if anything loaded it.

Run during the wheel build, alongside the Sass compile, so nothing generated is committed.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent          # src/design-system/python
POSE = HERE.parent / "components" / "Loader" / "pose.js"
DRIVER = HERE / "loader_driver.js"

# `export function f(`, `export const X =`, `export let`, `export class`.
EXPORT = re.compile(r"^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)", re.M)
# A whole import statement, single or multi-line, ending at its source string.
IMPORT = re.compile(r"^import\s[^;]*?from\s*['\"]([^'\"]+)['\"];?\s*$", re.M | re.S)
# What is left of either keyword once those two have run.
LEFTOVER = re.compile(r"^\s*(?:import|export)\b", re.M)


def _strip(source: str, path: pathlib.Path) -> str:
    """Drop the module syntax, and refuse anything the two patterns above do not cover."""
    for spec in IMPORT.findall(source):
        if not spec.endswith("pose.js"):
            raise SystemExit(f"{path}: imports {spec}; only pose.js can be joined into the script")
    out = EXPORT.sub("", IMPORT.sub("", source))
    stray = LEFTOVER.search(out)
    if stray:
        line = out[: stray.start()].count("\n") + 1
        raise SystemExit(f"{path}:{line}: module syntax the assembler does not handle: "
                         f"{out[stray.start():stray.end() + 60].splitlines()[0]!r}")
    return out.strip("\n")


def build() -> str:
    for path in (POSE, DRIVER):
        if not path.is_file():
            raise SystemExit(f"missing {path}")
    return (
        "/* GENERATED -- do not edit. Assembled by python/gen_loader_js.py from\n"
        "   components/Loader/pose.js and python/solara/driver.js, which Loader.tsx\n"
        "   and this share, so React and a page without it settle a loader alike. */\n"
        "(function () {\n"
        f"{_strip(POSE.read_text(), POSE)}\n\n"
        f"{_strip(DRIVER.read_text(), DRIVER)}\n"
        "})();\n"
    )


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", type=pathlib.Path, required=True)
    args = ap.parse_args(argv)
    text = build()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text)
    print(f"{args.out}: loader.js, {len(text.splitlines())} lines")
    return 0


if __name__ == "__main__":
    sys.exit(main())
