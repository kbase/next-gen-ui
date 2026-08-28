"""Compile the component stylesheets into one plain CSS file.

Each component's styles live in a CSS module (`<Name>/<Name>.module.scss`).
Vite rewrites those class names to content-hashed locals, which suits React
because nothing outside the module refers to them. A consumer with no bundler
needs stable names and compiled CSS instead.

hatch_build.py runs this during the wheel build, so the CSS a portal installs
is compiled from the sources at the version it installs.

Naming rule:

    root, or a local named after its component  ->  kb-<component>
    every other local                           ->  kb-<component>--<local>

Applied without exception. Whether a local is the root element or a modifier is
decided in the TSX, not the stylesheet, so the rule cannot tell them apart:
Button's root local is `btn`, and it becomes `kb-button--btn`. The prefix
prevents collisions between components, where 35 local names appear in more
than one and `root` appears in 21.

The compiler comes from pip, because a Python app installing
kbase-design-system has no Node and no checkout of this repository. libsass is
not an option: Loader.module.scss builds its keyframes with `@for` and
`math.div`, which libsass does not support. find_sass() covers the rest.

To see the output without building a wheel, from src/design-system:

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

# `:global(X)` becomes a plain `X`, since every name is global once the modules
# are merged. Unwrapping happens before local_names(), so a class written inside
# :global() would then be collected and prefixed like any other, losing the
# reference the wrapper protects. Every use today is an element selector.
GLOBAL = re.compile(r":global\(\s*(.*?)\s*\)", re.S)
# CSS modules' cross-module inheritance: not valid CSS, and not resolvable
# without a bundler. Listed in the output header rather than dropped silently.
COMPOSES = re.compile(r"^\s*composes:\s*(.+?)\s+from\s+(['\"])(.+?)\2\s*;\s*$", re.M)
COMMENT = re.compile(r"/\*.*?\*/", re.S)
KEYFRAMES = re.compile(r"@keyframes\s+([\w-]+)")
# Dart Sass emits `@charset "UTF-8";` whenever a module's output holds a non-ASCII byte, which
# here is an em dash in a comment. It is only valid as the first thing in a file, so it cannot
# survive concatenation into one sheet.
CHARSET = re.compile(r"^@charset[^;]*;\s*", re.M)


def kebab(name: str) -> str:
    """onWhite -> on-white, SegmentedControl -> segmented-control."""
    return re.sub(r"(?<!^)(?=[A-Z])", "-", name).lower()


def public_name(component: str, local: str, locals_: set[str]) -> str:
    """`root` takes the short name. A local named after its component takes it
    only when there is no `root`: Badge has both `.root` (the positioning host)
    and `.badge`, and merging them would put position:absolute on the host."""
    comp = kebab(component)
    if local == "root" or (kebab(local) == comp and "root" not in locals_):
        return f"kb-{comp}"
    return f"kb-{comp}--{kebab(local)}"


def _blocks(css: str):
    """Yield each selector prelude, with comments and declaration bodies
    removed, so a word inside a comment or a url() is not read as a class.

    Every depth, not just the top: a class used only inside `@media` or
    `@supports` is still a class, and one missed here ships without its prefix.
    A `;` clears the buffer because a statement at-rule ends in one, and would
    otherwise run into the selector after it."""
    buf: list[str] = []
    for ch in COMMENT.sub("", css):
        if ch in "{};":
            if ch == "{":
                yield "".join(buf)
            buf = []
        else:
            buf.append(ch)


def local_names(css: str) -> set[str]:
    names: set[str] = set()
    for sel in _blocks(css):
        # An at-rule prelude declares no class, and a media query can carry a dot in a value.
        if sel.strip().startswith("@"):
            continue
        names.update(re.findall(r"\.([A-Za-z_][\w-]*)", sel))
    return names


def find_sass() -> list[str] | None:
    """Locate a Dart Sass binary, without requiring Node.

    The wheel is built wherever a portal installs it, so the compiler has to come from pip for that
    platform. Two PyPI packages carry a real Dart Sass: `dart-sass`, which vendors the binary for
    seven platforms including macOS, and `sass-embedded`, which has a newer Dart Sass but no macOS
    wheel -- its py3-none-any fallback contains no binary, so a Mac installs it and fails at
    runtime. Everything else on PyPI named for Sass is libsass.

    dart-sass vendors 1.51.0; package.json pins 1.99.0. The two produce the same selectors and
    declarations for every component, and check_compiler_parity.py holds them to that.

    A checkout's node_modules/.bin/sass is not used even when present, so that a maintainer and a
    portal compile with the same program. Pass --sass to override; check_compiler_parity.py does.
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
    # The wheel ships the binary without the executable bit set.
    mode = exe.stat().st_mode
    if not mode & stat.S_IXUSR:
        exe.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return [str(exe)]


def compile_module(scss: pathlib.Path, out_dir: pathlib.Path, sass_cmd: list[str]) -> str:
    dest = out_dir / f"{scss.parent.name}.css"
    done = subprocess.run([*sass_cmd, "--style=expanded", "--no-source-map", str(scss), str(dest)],
                          capture_output=True, text=True)
    if done.returncode:
        # CalledProcessError reports the exit status and not the captured stderr, which is where
        # Sass names the file and line.
        raise SystemExit(f"{scss}: sass exited {done.returncode}\n{done.stderr.strip()}")
    return CHARSET.sub("", dest.read_text())


def rewrite(component: str, css: str) -> tuple[str, list[str]]:
    """Return one component's CSS under the public names, and notes for anything
    plain CSS cannot express."""
    notes: list[str] = []

    for local, _q, source in COMPOSES.findall(css):
        notes.append(f"{component}.{local} composes .{local} from {pathlib.Path(source).stem}")
    css = COMPOSES.sub("", css)
    css = GLOBAL.sub(r"\1", css)

    # Keyframe names are module-scoped too: two components can each define
    # `pulse` and mean different animations.
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

    # Longest first, so replacing .on does not corrupt .onWhite.
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
    ap.add_argument("--version", default="", help="version to record in the generated header")
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

   GENERATED -- do not edit. Compiled by Dart Sass from
   <Name>/<Name>.module.scss in kbase/next-gen-ui{f" ({args.version})" if args.version else ""}, so this file
   and the React build come from the same sources.

   Class names: a local named `root`, or named after its own component,
   becomes `kb-<component>`; every other local becomes
   `kb-<component>--<local>`.

   To change a component's appearance, edit its .module.scss and rebuild.

   {len(modules)} component stylesheets. A component with no styles of its own
   does not appear here.
   ============================================================================ */
"""
    if notes:
        header += "\n/* composes: rules, which plain CSS cannot express. Write both classes:\n"
        header += "".join(f"     {n}\n" for n in notes)
        header += " */\n"

    args.out.write_text(header + "\n" + "\n\n".join(chunks) + "\n")
    print(f"{args.out}: {len(modules)} components, {len(args.out.read_text().splitlines())} lines")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
