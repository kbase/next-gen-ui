import { useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'kbase-theme';
const ATTR = 'data-theme';

/** Inline in <head>, ahead of the stylesheet, so a dark-theme user gets no light frame. */
export const themeInitScript = `(function(){try{var v=localStorage.getItem('${KEY}');
if(v==='light'||v==='dark')document.documentElement.setAttribute('${ATTR}',v);}catch(e){}})();`;

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // Safari in private mode throws on read.
  }
  return 'system';
}

/** Stamps data-theme on <html> and remembers the choice. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute(ATTR);
    else root.setAttribute(ATTR, theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // The choice applies for this session but will not survive a reload.
    }
  }, [theme]);

  return { theme, setTheme };
}
