import { useCallback, useEffect, useState } from 'react';

/** What the user picked. `system` is the default and stamps no attribute. */
export type ThemeChoice = 'system' | 'light' | 'dark';
/** What that resolves to right now. */
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'kbase-theme';
const ATTR = 'data-theme';
const QUERY = '(prefers-color-scheme: dark)';

function isChoice(v: unknown): v is ThemeChoice {
  return v === 'system' || v === 'light' || v === 'dark';
}

function read(): ThemeChoice {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isChoice(v) ? v : 'system';
  } catch {
    // Safari in private mode throws on access, not just on write.
    return 'system';
  }
}

/**
 * Applying the choice is a DOM write, not React state, so it can run before
 * hydration and from the inline script below without pulling in React.
 */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute(ATTR);
  else root.setAttribute(ATTR, choice);
}

/**
 * Run before first paint to stop a light frame flashing ahead of a dark
 * theme. Inline it in the document head; it must not wait on a bundle.
 */
export const themeInitScript = `(function(){try{var v=localStorage.getItem('${STORAGE_KEY}');
if(v==='light'||v==='dark')document.documentElement.setAttribute('${ATTR}',v);}catch(e){}})();`;

export interface UseThemeResult {
  /** The stored choice, including `system`. */
  theme: ThemeChoice;
  /** What `system` currently means, or the explicit choice. */
  resolved: ResolvedTheme;
  setTheme: (next: ThemeChoice) => void;
}

export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<ThemeChoice>(read);
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia(QUERY).matches,
  );

  // Track the OS preference so `resolved` is right while the choice is `system`.
  useEffect(() => {
    const mq = matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Another tab writing the key should move this one too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = isChoice(e.newValue) ? e.newValue : 'system';
      setThemeState(next);
      applyTheme(next);
    };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Choice still applies for this session; it just will not survive a reload.
    }
  }, []);

  return {
    theme,
    resolved: theme === 'system' ? (systemDark ? 'dark' : 'light') : theme,
    setTheme,
  };
}
