import type { PluginId } from './workbench/core';

// What a fresh workbench starts as, before any layout is saved. A test
// after a different starting layout overrides the option explicitly rather
// than editing this file.

// Related is last on purpose: it appears and disappears with what is on
// screen, and anywhere above the navigators it would shove them down the
// column every time it did.
export const DEFAULT_PINNED: readonly PluginId[] = ['shortcuts', 'koros', 'related'];

// Which plugin answers free text and which ranks it. Both are ids and
// neither is optional: Settings offers no "none", and the prompt bar draws no
// row of its own, so a workbench whose intent is not among `localPlugins`
// answers a typed name with nothing.
export const DEFAULT_ASSISTANT: PluginId = 'koros';
export const DEFAULT_INTENT: PluginId = 'intent';
