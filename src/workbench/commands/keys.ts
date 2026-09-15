// Keyboard chords as strings ("Ctrl+Shift+ArrowLeft") so a user's overrides
// are plain JSON in the settings document. Defaults avoid keys browsers own:
// Ctrl+W/T/N, Ctrl+Tab, Ctrl+PageUp/PageDown, Ctrl+1..9, Alt+Left/Right.

export interface Chord {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

const MODIFIERS = new Set(['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd', 'mod']);

export function parseChord(text: string): Chord {
  const chord: Chord = { key: '', ctrl: false, shift: false, alt: false, meta: false };
  for (const raw of text.split('+')) {
    const part = raw.trim();
    const lower = part.toLowerCase();
    if (MODIFIERS.has(lower)) {
      if (lower === 'ctrl' || lower === 'control' || lower === 'mod') chord.ctrl = true;
      else if (lower === 'shift') chord.shift = true;
      else if (lower === 'alt') chord.alt = true;
      else chord.meta = true;
    } else {
      chord.key = normalizeKey(part);
    }
  }
  return chord;
}

export function chordFromEvent(event: KeyLike): Chord {
  return {
    key: normalizeKey(event.key),
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  };
}

export function chordToString(chord: Chord): string {
  const parts: string[] = [];
  if (chord.ctrl) parts.push('Ctrl');
  if (chord.alt) parts.push('Alt');
  if (chord.shift) parts.push('Shift');
  if (chord.meta) parts.push('Meta');
  parts.push(chord.key);
  return parts.join('+');
}

export function sameChord(a: Chord, b: Chord): boolean {
  return (
    a.key === b.key &&
    a.ctrl === b.ctrl &&
    a.shift === b.shift &&
    a.alt === b.alt &&
    a.meta === b.meta
  );
}

// Letters compare case-insensitively (Shift changes `event.key`'s case);
// everything else keeps the DOM name.
function normalizeKey(key: string): string {
  if (key === ' ') return 'Space';
  return key.length === 1 ? key.toUpperCase() : key;
}

// Command names are qualified, as everywhere in the registry.
export const DEFAULT_KEYBINDINGS: Readonly<Record<string, string>> = {
  '/': 'workbench:prompt',
  'Ctrl+Z': 'workbench:undo',
  'Ctrl+Shift+Z': 'workbench:redo',
  'Alt+Shift+W': 'workbench:close',
  'Alt+Shift+ArrowLeft': 'workbench:focus-previous-tab',
  'Alt+Shift+ArrowRight': 'workbench:focus-next-tab',
  'Alt+Shift+ArrowUp': 'workbench:focus-previous-group',
  'Alt+Shift+ArrowDown': 'workbench:focus-next-group',
  'Ctrl+Alt+Shift+ArrowLeft': 'workbench:move-left',
  'Ctrl+Alt+Shift+ArrowRight': 'workbench:move-right',
  'Ctrl+Alt+Shift+ArrowUp': 'workbench:move-up',
  'Ctrl+Alt+Shift+ArrowDown': 'workbench:move-down',
  'Alt+Shift+F': 'workbench:fold',
  'Alt+Shift+B': 'workbench:sidebar',
};

// Chord text to qualified command name. '' is a chord the user took away
// from a default; it matches and runs nothing, which is what stops the
// default underneath it.
export type KeyTable = Readonly<Record<string, string>>;

export interface KeybindingTableOptions {
  overrides: KeyTable;
  // Whether a command is registered. An override naming one that is not —
  // the plugin that declared it is gone — is left out, so the chord goes
  // back to its default meaning while the command is away. The entry stays
  // in the settings document and takes effect again if the command returns.
  exists?: (command: string) => boolean;
  defaults?: KeyTable;
}

export function keybindingTable({
  overrides,
  exists = () => true,
  defaults = DEFAULT_KEYBINDINGS,
}: KeybindingTableOptions): Record<string, string> {
  const table: Record<string, string> = { ...defaults };
  for (const [text, command] of Object.entries(overrides)) {
    if (command && !exists(command)) continue;
    table[text] = command;
  }
  return table;
}

export function boundCommand(table: KeyTable, pressed: Chord): string | null {
  for (const [text, command] of Object.entries(table)) {
    if (sameChord(parseChord(text), pressed)) return command || null;
  }
  return null;
}

export function resolveKeybinding(event: KeyLike, table: KeyTable): string | null {
  return boundCommand(table, chordFromEvent(event));
}

// The chord that runs a command, in the text the table stores it under.
export function chordFor(table: KeyTable, command: string): string | null {
  for (const [text, name] of Object.entries(table)) {
    if (name === command) return text;
  }
  return null;
}

// The overrides that make `chord` run `command`, or that leave the command
// with no chord when it is null. Whatever chord ran the command gives way;
// an override that would restate a default is dropped instead of stored, so
// a table only ever holds what the user changed.
export function setKeybinding(
  overrides: KeyTable,
  command: string,
  chord: string | null,
  defaults: KeyTable = DEFAULT_KEYBINDINGS,
): Record<string, string> {
  const next: Record<string, string> = { ...overrides };
  for (const [text, name] of Object.entries(keybindingTable({ overrides, defaults }))) {
    if (name !== command) continue;
    // A default is only silenced by an explicit '' — deleting the override
    // would uncover it again.
    if (defaults[text] === command) next[text] = '';
    else delete next[text];
  }
  if (chord) next[chord] = command;
  for (const [text, name] of Object.entries(next)) {
    if (defaults[text] === name || (name === '' && !(text in defaults))) delete next[text];
  }
  return next;
}
