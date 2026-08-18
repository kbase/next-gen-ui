import { useCallback, useEffect, useState } from 'react';

/**
 * Which theme the tokens should resolve to. `system` — the default — stamps no
 * attribute and lets the OS decide.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

/** Where the choice is stored, and the attribute it stamps on `<html>`. */
export const THEME_STORAGE_KEY = 'kbase-theme';
export const THEME_ATTRIBUTE = 'data-theme';

function isChoice(v: unknown): v is ThemeChoice {
  return v === 'system' || v === 'light' || v === 'dark';
}

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isChoice(v) ? v : 'system';
  } catch {
    // Safari in private mode throws on read, not only on write.
    return 'system';
  }
}

/**
 * Inline this in `<head>`, ahead of any stylesheet, so a dark-theme user does
 * not get a light frame while the bundle loads:
 *
 *     <script>{themeInitScript}</script>
 *
 * Non-bundled pages can paste the same one-liner; it depends on nothing.
 */
export const themeInitScript = `(function(){try{var v=localStorage.getItem('${THEME_STORAGE_KEY}');
if(v==='light'||v==='dark')document.documentElement.setAttribute('${THEME_ATTRIBUTE}',v);}catch(e){}})();`;

export interface UseThemeResult {
  theme: ThemeChoice;
  setTheme: (next: ThemeChoice) => void;
}

/**
 * Reads and sets the theme. Stamps `data-theme` on `<html>` — the tokens do the
 * rest — persists the choice, and follows it if another tab changes it.
 */
export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<ThemeChoice>(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute(THEME_ATTRIBUTE);
    else root.setAttribute(THEME_ATTRIBUTE, theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setThemeState(isChoice(e.newValue) ? e.newValue : 'system');
    };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this session; it just will not survive a reload.
    }
  }, []);

  return { theme, setTheme };
}
