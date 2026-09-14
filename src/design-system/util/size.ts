/**
 * A control's density tier. A component's `size` prop renders it as `data-size` on the
 * element, and the DENSITY SELECTION rules in tokens.css do the rest; the same attribute on any
 * ancestor sets it for a subtree, and `data-density="compact"` is the region-level spelling of
 * `sm`. The tier values themselves live in tokens.css.
 */
export type Size = 'xs' | 'sm' | 'md';
