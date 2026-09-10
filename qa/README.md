# Checks

Two files of cases against a deployed build, run with Playwright:

    node qa/related.cases.cjs     # the feature's own criteria
    node qa/related.block.cjs     # the block's behaviour, themes, regressions

They need `playwright` resolvable and a build being served; point `BASE` at it.
Each case prints expected and actual so a failure says what happened, not just
that something did.

These do not replace reading the diff. Every defect in the last pass — an
`accept()` that could no-op mid-round, a dependency on the cart's length rather
than its contents, a dismissal that leaked across subjects, a runner nothing
stopped — was found by reading the code; the script found two, and two of its
own failures turned out to be the script's bugs.
