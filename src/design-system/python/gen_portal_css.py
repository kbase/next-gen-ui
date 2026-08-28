"""Compile the component stylesheets into one plain CSS sheet.

Each component's look lives in a CSS module (`<Name>/<Name>.module.scss`) whose
class names Vite rewrites to content-hashed locals at build time. A React
consumer never says those names, so it does not care what they are. A consumer
with no bundler -- a Python app, which is what this exists for -- can wear the
same look, but only if the names are stable and the Sass is compiled. That is
all this does.

hatch_build.py runs it during the wheel build, so the sheet a portal installs
was compiled from the sources at the tag it installed, by the design system
rather than by hand downstream.

The compiler arrives from pip, because the consumer does: a Python app
installing kbase-design-system has no Node, no npm and no checkout of this
repository. See find_sass() for which package that leaves, and for why its
being three versions behind the `sass` in package.json was measured rather than
waved through.

That the compiler is a real Dart Sass matters more than it sounds.
`Loader.module.scss` computes its braid keyframes with `@for` and `math.div`,
which libsass -- the engine behind every pip package named for Sass except two
-- cannot parse at all.

Naming. A bundler is free to hash locals because it rewrites the JSX in the
same pass; nothing outside the module ever says the name. Here the name IS the
interface -- Python writes it into an element's class by hand -- so it has to
be legible and stable:

    root, or a local named after its component  ->  kb-<component>
    every other local                           ->  kb-<component>--<local>

One rule, applied blind. It deliberately does not try to sort locals into
"parts" and "variants", the way hand-written BEM would: which local is the root
element and which is a modifier is decided in the TSX, not in the stylesheet, so
a stylesheet-only tool cannot know it and would have to guess. A wrong guess
produces a name that lies. `kb-button--btn` is the price of not guessing.

The prefix is not decoration. 38 local names are shared across more than one
component (`root` in 23 of them, `green`, `red`, `primary`, `title` in 7 each),
so an unprefixed merge would silently cross-wire components.

To see what the build produces, from src/design-system:

    python python/gen_portal_css.py --out /tmp/components.css
"""

from __future__ import annotations

import argparse
import pathlib
import platform
import re
import stat
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent   # src/design-system/python
ROOT = HERE.parent                               # src/design-system

# Rewritten into a plain selector: a bundler reads :global() as "leave this name
# alone", and every name here is already global once the module is flattened.
GLOBAL = re.compile(r":global\(\s*(.*?)\s*\)", re.S)
# CSS modules' cross-module inheritance. Invalid CSS, and unresolvable without a
# bundler; it is reported rather than dropped in silence.
COMPOSES = re.compile(r"^\s*composes:\s*(.+?)\s+from\s+(['\"])(.+?)\2\s*;\s*$", re.M)
COMMENT = re.compile(r"/\*.*?\*/", re.S)
KEYFRAMES = re.compile(r"@keyframes\s+([\w-]+)")


def kebab(name: str) -> str:
    """onWhite -> on-white, SegmentedControl -> segmented-control."""
    return re.sub(r"(?<!^)(?=[A-Z])", "-", name).lower()


def public_name(component: str, local: str, locals_: set[str]) -> str:
    """`root` always wins the short name. A local named after its own component
    only wins it when there is no `root` to lose to -- Badge has both `.root`
    (the host that positions the badge) and `.badge` (the badge itself), and
    collapsing them would put `position: absolute` on the host."""
    comp = kebab(component)
    if local == "root" or (kebab(local) == comp and "root" not in locals_):
        return f"kb-{comp}"
    return f"kb-{comp}--{kebab(local)}"


def _blocks(css: str):
    """Yield each selector prelude, with comments and declaration bodies removed
    so a word inside a comment or a url() is never mistaken for a class."""
    depth = 0
    buf: list[str] = []
    for ch in COMMENT.sub("", css):
        if ch == "{":
            if depth == 0:
                yield "".join(buf)
                buf = []
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)
        elif depth == 0:
            buf.append(ch)


def local_names(css: str) -> set[str]:
    names: set[str] = set()
    for sel in _blocks(css):
        if sel.strip().startswith("@"):
            continue
        names.update(re.findall(r"\.([A-Za-z_][\w-]*)", sel))
    return names


def find_sass() -> list[str] | None:
    """A Dart Sass to compile with, without needing Node.

    The consumer of all this is a Python app pip-installing the design system, so the compiler has
    to arrive the same way: from pip, on whatever platform the app is being installed on. Exactly
    one package on PyPI does that -- `dart-sass`, which vendors the real Dart Sass executable for
    seven platforms, macOS included. (`sass-embedded` carries a newer Dart Sass but publishes no
    macOS wheel; everything else on PyPI named for Sass is libsass, which cannot parse Loader.)

    It vendors 1.51.0 rather than the 1.99.0 the design system's package.json pins. That was
    checked rather than assumed: compiled both ways, all 45 components come out with identical
    selectors and declarations, differing only in where Dart Sass parks an orphan comment and
    whether it quotes an attribute selector with ' or ". Nothing that reaches a pixel.

    Deliberately does NOT prefer a checkout's node_modules/.bin/sass, tempting as that is. The
    wheel is built on the installing machine, where there is no checkout; preferring one here would
    mean a maintainer's sheet and a portal's sheet came out of different compilers, and only the
    maintainer's was ever looked at. One compiler, chosen the same way everywhere. Pass --sass to
    override, which is how CI compares this against the pinned npm `sass`.
    """
    try:
        import dartsass
    except ImportError:
        return None

    machine = platform.machine().lower()
    arch = "arm64" if machine in ("arm64", "aarch64") else ("x64" if machine in ("x86_64", "amd64") else "ia32")
    system = {"darwin": "macos", "win32": "windows"}.get(sys.platform, "linux")
    exe = pathlib.Path(dartsass.__file__).parent / f"sass/{system}-{arch}/dart-sass/sass"
    exe = exe.with_suffix(".bat") if system == "windows" and not exe.exists() else exe
    if not exe.exists():
        return None
    # The wheel is built without the executable bit, so a fresh install cannot run what it ships.
    mode = exe.stat().st_mode
    if not mode & stat.S_IXUSR:
        exe.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return [str(exe)]


def compile_module(scss: pathlib.Path, out_dir: pathlib.Path, sass_cmd: list[str]) -> str:
    dest = out_dir / f"{scss.parent.name}.css"
    subprocess.run([*sass_cmd, "--style=expanded", "--no-source-map", str(scss), str(dest)],
                   check=True, capture_output=True, text=True)
    return dest.read_text()


def rewrite(component: str, css: str) -> tuple[str, list[str]]:
    """Return the sheet with public class and keyframe names, plus any notes."""
    notes: list[str] = []

    for local, _q, source in COMPOSES.findall(css):
        notes.append(
            f"{component}.{local} composes {local} from {pathlib.Path(source).stem}"
            " -- apply both classes in the markup"
        )
    css = COMPOSES.sub("", css)
    css = GLOBAL.sub(r"\1", css)

    # Keyframe names are module-scoped too, so two components may both animate
    # something called "pulse" and mean different things.
    for frames in sorted(set(KEYFRAMES.findall(css)), key=len, reverse=True):
        if frames.startswith("kb-"):
            continue
        css = re.sub(rf"(?<![\w-]){re.escape(frames)}(?![\w-])", f"kb-{kebab(component)}-{frames}", css)

    locals_ = local_names(css)
    taken: dict[str, str] = {}
    for local in locals_:
        name = public_name(component, local, locals_)
        if name in taken:
            raise SystemExit(
                f"{component}: .{local} and .{taken[name]} both become .{name}. "
                "Two elements would share one rule set; fix public_name()."
            )
        taken[name] = local

    # Longest first: .on and .onWhite both exist, and .on must not eat .onWhite.
    for local in sorted(locals_, key=len, reverse=True):
        css = re.sub(
            rf"\.{re.escape(local)}(?![\w-])",
            "." + public_name(component, local, locals_),
            css,
        )
    return css.strip(), notes


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--components", type=pathlib.Path, default=ROOT / "components",
                    help="the directory of <Name>/<Name>.module.scss sources")
    ap.add_argument("--out", type=pathlib.Path, required=True, help="where to write the sheet")
    ap.add_argument("--sass", help="path to a Dart Sass executable; found automatically by default")
    ap.add_argument("--version", default="", help="design system tag, recorded in the header")
    args = ap.parse_args(argv)

    modules = sorted(
        p for p in args.components.glob("*/*.module.scss") if p.name == f"{p.parent.name}.module.scss"
    )
    if not modules:
        print(f"no <Name>/<Name>.module.scss under {args.components}", file=sys.stderr)
        return 1

    sass_cmd = [args.sass] if args.sass else find_sass()
    if not sass_cmd:
        print("no Dart Sass found: pip install dart-sass (or pass --sass)", file=sys.stderr)
        return 1
    version = subprocess.run([*sass_cmd, "--version"], capture_output=True, text=True).stdout.strip()
    print(f"sass: {sass_cmd[0]} ({version})")

    chunks: list[str] = []
    notes: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        out_dir = pathlib.Path(td)
        for scss in modules:
            component = scss.parent.name
            css, n = rewrite(component, compile_module(scss, out_dir, sass_cmd))
            notes.extend(n)
            chunks.append(f"/* --- {component} {'-' * max(3, 68 - len(component))} */\n{css}")

    header = f"""/* ============================================================================
   KBase design-system components, as plain CSS.

   GENERATED -- do not edit. Every rule below was compiled from
   <Name>/<Name>.module.scss in kbase/next-gen-ui{f" ({args.version})" if args.version else ""} by the design
   system's own Dart Sass, so this sheet and the React build agree by
   construction rather than by anyone's care.

   Class names are mechanical: a local named `root`, or named after its own
   component, becomes `kb-<component>`; every other local becomes
   `kb-<component>--<local>`.

   To change what a component looks like, change its .module.scss and rebuild;
   the wheel is where this sheet is made.

   {len(modules)} components.
   ============================================================================ */
"""
    if notes:
        header += "\n/* Cross-module composition, which plain CSS cannot express:\n"
        header += "".join(f"     {n}\n" for n in notes)
        header += " */\n"

    args.out.write_text(header + "\n" + "\n\n".join(chunks) + "\n")
    print(f"{args.out}: {len(modules)} components, {len(args.out.read_text().splitlines())} lines")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
