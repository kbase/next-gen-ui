"""Compile the component stylesheets into the wheel.

Component styles live in one CSS module each, which Vite rewrites at build
time. The built stylesheet exists only in gitignored dist/, and pip builds the
wheel from source, so a Python consumer would otherwise get the tokens and no
component CSS. This hook runs gen_portal_css.py during the wheel build and force-includes
the result as kbase_design_system/components.css.

For

    pip install "kbase-design-system @ git+https://...#subdirectory=src/design-system"

pip clones at the tag and builds on the installing machine, so the compile
happens there against the sources it just cloned. For a wheel published from CI
it happened once. Either way the CSS matches the sources it came from.

The compiler is declared under this hook's own `dependencies` in pyproject.toml,
so hatchling installs it into the build environment. It is not a runtime
dependency and not in [build-system] requires.

The .scss sources do not enter the wheel; the hook reads them from the source
tree and writes only CSS. force-include accepts a directory but ignores
`exclude`, so components/ cannot be shipped without its 106 .tsx and .ts files.
"""

from __future__ import annotations

import importlib.util
import pathlib
import tempfile

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

HERE = pathlib.Path(__file__).resolve().parent   # src/design-system/python


def _generator():
    """Import gen_portal_css.py by path.

    It sits beside this file, which is not on sys.path during a build. Neither
    file is part of a package; both exist only at build time.
    """
    spec = importlib.util.spec_from_file_location("gen_portal_css", HERE / "gen_portal_css.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CustomBuildHook(BuildHookInterface):
    PLUGIN_NAME = "custom"

    def initialize(self, version, build_data):
        if self.target_name != "wheel":
            return

        gen = _generator()

        # A wheel carrying the tokens and no component CSS installs cleanly and shows up only as an
        # unstyled page, so this stops instead.
        if gen.find_sass() is None:
            raise RuntimeError(
                "no Dart Sass in the build environment, so this wheel would carry the tokens and "
                "no component CSS. dart-sass is declared under "
                "[tool.hatch.build.hooks.custom].dependencies, so an isolated build has it; a "
                "build run with --no-build-isolation must supply it: pip install 'dart-sass>=0.5.2'."
            )

        out = pathlib.Path(self._workdir.name) / "components.css"
        # --components defaults to the sources beside the generator, which during a build is the
        # tree pip just cloned.
        code = gen.main(["--out", str(out), "--version", self.metadata.version])
        # A partial file is refused for the same reason. main() returns non-zero for a missing
        # sources directory; a component that fails to compile, or two locals that would collide,
        # raise rather than returning a code.
        if code:
            raise RuntimeError(f"gen_portal_css exited {code}; not building a wheel without components.css")

        build_data["force_include"][str(out)] = "kbase_design_system/components.css"

    @property
    def _workdir(self):
        # hatchling copies force-included files after initialize() returns, so the temporary
        # directory has to outlive it.
        if not hasattr(self, "_workdir_value"):
            self._workdir_value = tempfile.TemporaryDirectory(prefix="kbase-ds-css-")
        return self._workdir_value

    def finalize(self, version, build_data, artifact_path):
        if hasattr(self, "_workdir_value"):
            self._workdir_value.cleanup()
            del self._workdir_value
