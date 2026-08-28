"""KBase design system assets, for a consumer with no bundler.

Stylesheets sit beside this file and are read rather than imported:

    from importlib.resources import files
    css = (files("kbase_design_system") / "components.css").read_text()

This file exists so that call works. Without it the wheel is a namespace
package, and importlib.resources.files() raises TypeError on Python 3.9 --
the floor this package declares.
"""
