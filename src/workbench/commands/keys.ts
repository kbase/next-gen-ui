// Keyboard chords as strings ("Ctrl+Shift+ArrowLeft") so the layout can
// store user overrides. Defaults avoid keys browsers own: Ctrl+W/T/N,
// Ctrl+Tab, Ctrl+PageUp/PageDown, Ctrl+1..9, Alt+Left/Right.

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

export const DEFAULT_KEYBINDINGS: Readonly<Record<string, string>> = {
  '/': 'prompt',
  'Ctrl+Z': 'undo',
  'Ctrl+Shift+Z': 'redo',
  'Alt+Shift+W': 'close',
  'Alt+Shift+ArrowLeft': 'focus-previous-tab',
  'Alt+Shift+ArrowRight': 'focus-next-tab',
  'Alt+Shift+ArrowUp': 'focus-previous-group',
  'Alt+Shift+ArrowDown': 'focus-next-group',
  'Ctrl+Alt+Shift+ArrowLeft': 'move-left',
  'Ctrl+Alt+Shift+ArrowRight': 'move-right',
  'Ctrl+Alt+Shift+ArrowUp': 'move-up',
  'Ctrl+Alt+Shift+ArrowDown': 'move-down',
  'Alt+Shift+F': 'fold',
  'Alt+Shift+B': 'sidebar',
  'Alt+Shift+C': 'customize',
};

// User overrides win; a user binding of null (stored as '') removes a default.
export function resolveKeybinding(
  event: KeyLike,
  overrides: Readonly<Record<string, string>>,
  defaults: Readonly<Record<string, string>> = DEFAULT_KEYBINDINGS,
): string | null {
  const pressed = chordFromEvent(event);
  const table = { ...defaults, ...overrides };
  for (const [text, command] of Object.entries(table)) {
    if (sameChord(parseChord(text), pressed)) return command || null;
  }
  return null;
}
