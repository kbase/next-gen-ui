import { useMediaQuery } from './useMediaQuery';

/** Which keystroke fires a composer's submit. */
export type SubmitOn = 'enter' | 'modifier';

/**
 * `submitOn`, reduced to what the device can actually reach. A soft keyboard
 * has no Shift+Enter and no Ctrl+Enter — shift there is a mode toggle for the
 * next character, not a held modifier — so Enter has to be the newline and the
 * surrounding button the only way to submit.
 */
export function useSubmitMode(submitOn: SubmitOn = 'enter'): SubmitOn {
  return useHardwareKeyboard() ? submitOn : 'modifier';
}

/**
 * Whether a hardware keyboard is likely present. A fine pointer means a mouse
 * or trackpad, which is the closest available signal — the two usually travel
 * together, and a wrong guess costs a tap rather than an unfinished message.
 */
export function useHardwareKeyboard(): boolean {
  return useMediaQuery('(any-pointer: fine)');
}
