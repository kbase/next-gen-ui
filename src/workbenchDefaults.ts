import type { PluginId } from './workbench/core';

// What a fresh workbench starts as, before any layout is saved. A test
// after a different starting layout overrides the option explicitly rather
// than editing this file.

// Related is last on purpose: it appears and disappears with what is on
// screen, and anywhere above the navigators it would shove them down the
// column every time it did.
export const DEFAULT_PINNED: readonly PluginId[] = ['shortcuts', 'koros', 'related'];
export const DEFAULT_ASSISTANT: PluginId = 'koros';
export const DEFAULT_INTENT: PluginId = 'intent';
