import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYBINDINGS, chordToString, parseChord, resolveKeybinding } from './keys';

const press = (
  key: string,
  mods: Partial<Record<'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey', boolean>> = {},
) => ({
  key,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...mods,
});

describe('chords', () => {
  it('round-trips through text in canonical modifier order', () => {
    expect(chordToString(parseChord('shift+ctrl+arrowleft'))).toBe('Ctrl+Shift+arrowleft');
    expect(chordToString(parseChord('Alt+Shift+w'))).toBe('Alt+Shift+W');
  });

  it('matches letters regardless of the case Shift produced', () => {
    expect(resolveKeybinding(press('W', { altKey: true, shiftKey: true }), {})).toBe('close');
    expect(resolveKeybinding(press('w', { altKey: true, shiftKey: true }), {})).toBe('close');
  });

  it('user overrides win and an empty override removes a default', () => {
    expect(resolveKeybinding(press('Z', { ctrlKey: true }), { 'Ctrl+Z': 'close' })).toBe('close');
    expect(resolveKeybinding(press('Z', { ctrlKey: true }), { 'Ctrl+Z': '' })).toBeNull();
  });

  it('the defaults leave browser-owned chords alone', () => {
    for (const reserved of [
      'Ctrl+W',
      'Ctrl+T',
      'Ctrl+N',
      'Ctrl+Tab',
      'Ctrl+PageUp',
      'Alt+ArrowLeft',
    ]) {
      expect(DEFAULT_KEYBINDINGS[reserved]).toBeUndefined();
    }
  });
});
