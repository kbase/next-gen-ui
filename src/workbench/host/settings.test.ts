import { describe, expect, it, vi } from 'vitest';
import { createSettingsStore } from './settings';

describe('the settings document', () => {
  it('merges a patch over what is held', () => {
    const settings = createSettingsStore({ assistant: 'koros', intent: 'intent' });
    settings.set({ assistant: 'other' });
    expect(settings.get()).toEqual({ assistant: 'other', intent: 'intent', keybindings: {} });
  });

  // Every change is written to storage and redraws the prompt bar, so a patch
  // that names what is already set is not one. The version is what a React
  // reader takes as its snapshot; it moves with the writes.
  it('is unchanged by a patch that sets what it already holds', () => {
    const settings = createSettingsStore({ assistant: 'koros', intent: 'intent' });
    const seen = vi.fn();
    settings.subscribe(seen);
    settings.set({ assistant: 'koros' });
    settings.set({ intent: 'intent', assistant: 'koros' });
    expect(seen).not.toHaveBeenCalled();
    expect(settings.version()).toBe(0);

    settings.set({ assistant: 'other' });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(settings.version()).toBe(1);
  });
});
