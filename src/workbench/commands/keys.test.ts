import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KEYBINDINGS,
  chordFor,
  chordToString,
  keybindingTable,
  parseChord,
  resolveKeybinding,
  setKeybinding,
} from './keys';

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

const table = (overrides: Record<string, string> = {}, exists?: (command: string) => boolean) =>
  keybindingTable({ overrides, exists });

describe('chords', () => {
  it('round-trips through text in canonical modifier order', () => {
    expect(chordToString(parseChord('shift+ctrl+arrowleft'))).toBe('Ctrl+Shift+arrowleft');
    expect(chordToString(parseChord('Alt+Shift+w'))).toBe('Alt+Shift+W');
  });

  it('matches letters regardless of the case Shift produced', () => {
    expect(resolveKeybinding(press('W', { altKey: true, shiftKey: true }), table())).toBe(
      'workbench:close',
    );
    expect(resolveKeybinding(press('w', { altKey: true, shiftKey: true }), table())).toBe(
      'workbench:close',
    );
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

describe('the table a keypress is matched against', () => {
  it('takes the override over the default, and takes a chord away on an empty one', () => {
    expect(
      resolveKeybinding(press('Z', { ctrlKey: true }), table({ 'Ctrl+Z': 'workbench:close' })),
    ).toBe('workbench:close');
    expect(resolveKeybinding(press('Z', { ctrlKey: true }), table({ 'Ctrl+Z': '' }))).toBeNull();
  });

  it('leaves out an override whose command is not registered, uncovering the default', () => {
    const gone = table({ 'Ctrl+Z': 'gk:dossier' }, (command) => command !== 'gk:dossier');
    expect(resolveKeybinding(press('Z', { ctrlKey: true }), gone)).toBe('workbench:undo');
    // The chord it was moved to does nothing at all while the command is away.
    const moved = table({ 'Ctrl+Y': 'gk:dossier' }, (command) => command !== 'gk:dossier');
    expect(resolveKeybinding(press('Y', { ctrlKey: true }), moved)).toBeNull();
  });

  it('honours an unbinding whatever the registry holds', () => {
    const off = table({ 'Ctrl+Z': '' }, () => false);
    expect(resolveKeybinding(press('Z', { ctrlKey: true }), off)).toBeNull();
  });
});

describe('editing the overrides', () => {
  it('moves a command to a new chord and silences the default it left', () => {
    const next = setKeybinding({}, 'workbench:undo', 'Ctrl+Y');
    expect(next).toEqual({ 'Ctrl+Z': '', 'Ctrl+Y': 'workbench:undo' });
    expect(chordFor(table(next), 'workbench:undo')).toBe('Ctrl+Y');
    expect(resolveKeybinding(press('Z', { ctrlKey: true }), table(next))).toBeNull();
  });

  it('stores nothing for a chord that is already the default', () => {
    expect(setKeybinding({ 'Ctrl+Z': '' }, 'workbench:undo', 'Ctrl+Z')).toEqual({});
  });

  it('drops the binding when given no chord, and drops the entry rather than emptying it', () => {
    expect(setKeybinding({}, 'workbench:undo', null)).toEqual({ 'Ctrl+Z': '' });
    expect(setKeybinding({ 'Ctrl+Y': 'workbench:undo' }, 'workbench:undo', null)).toEqual({
      'Ctrl+Z': '',
    });
  });

  it('binds a command the defaults never named, and takes it back again', () => {
    const bound = setKeybinding({}, 'gk:dossier', 'Ctrl+Alt+D');
    expect(bound).toEqual({ 'Ctrl+Alt+D': 'gk:dossier' });
    expect(setKeybinding(bound, 'gk:dossier', null)).toEqual({});
  });
});
