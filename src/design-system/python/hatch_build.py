"""Compile the component stylesheets into the wheel.

The design system's look lives in 45 CSS modules that Vite rewrites at build
time. A React consumer gets that for free. A Python consumer -- a Solara portal
-- gets nothing, because the built stylesheet exists only in gitignored `dist/`
and pip builds the wheel from source, so nothing runs Vite during an install.
This hook closes that gap: it runs gen_portal_css.py at wheel-build time and
force-includes the result as kbase_design_system/components.css.

Where "wheel-build time" lands depends on how the portal installs. For

    pip install "kbase-design-system @ git+https://…#subdirectory=src/design-system"

pip clones at the tag and builds on the portal's machine, so this compiles
there, against the sources it just cloned. For a wheel published from CI it ran
once and the consumer only unpacks a file. Either way the sheet cannot drift
from the sources it was made from.

The compiler is declared under this hook's own `dependencies` in pyproject.toml
rather than in [build-system] requires, so hatchling installs it into the build
environment and nothing else in the build has to know it exists. It is not a
runtime dependency of the package.

The .scss sources never enter the wheel: this reads them from the source tree
and writes only CSS. That is not merely tidy. `force-include` accepts a
directory but ignores `exclude`, so shipping `components/` to compile later
would drag 108 .tsx and .ts files in with it, with no pattern available to stop
them.
"""

from __future__ import annotations

import importlib.util
import pathlib
import tempfile

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

HERE = pathlib.Path(__file__).resolve().parent   # src/design-system/python


def _generator():
    """Import gen_portal_css.py by path.

    It sits beside this file, which is not on sys.path during a build, and it is
    deliberately not a package: nothing imports it at runtime, and making one
    would put an importable `python` on the wheel's namespace.
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

        # Stopping is the good outcome. A wheel that quietly ships the tokens with no component CSS
        # installs cleanly and produces an unstyled portal, which is found in a browser rather than
        # in a build log.
        if gen.find_sass() is None:
            raise RuntimeError(
                "no Dart Sass in the build environment, so this wheel would ship the tokens with "
                "no component CSS at all. dart-sass is declared under "
                "[tool.hatch.build.hooks.custom].dependencies, so a normal build has it; a build "
                "run with --no-build-isolation has to supply it itself: "
                "pip install 'dart-sass>=0.5.2'."
            )

        # Likewise a partial sheet, which looks like it worked. main() returns non-zero for a
        # missing sources directory; a component that fails to compile, or two locals that would
        # collide, raise out of it.
        out = pathlib.Path(self._workdir.name) / "components.css"
        # --components defaults to the sources beside the generator, which during a build is the
        # tree pip just cloned.
        code = gen.main(["--out", str(out), "--version", self.metadata.version])
        if code:
            raise RuntimeError(f"gen_portal_css exited {code}; refusing to build a wheel without components.css")

        build_data["force_include"][str(out)] = "kbase_design_system/components.css"

    @property
    def _workdir(self):
        # Held on the hook rather than scoped to initialize(): hatchling copies force-included
        # files after initialize() returns, so the directory has to outlive it.
        if not hasattr(self, "_workdir_value"):
            self._workdir_value = tempfile.TemporaryDirectory(prefix="kbase-ds-css-")
        return self._workdir_value

    def finalize(self, version, build_data, artifact_path):
        if hasattr(self, "_workdir_value"):
            self._workdir_value.cleanup()
            del self._workdir_value
