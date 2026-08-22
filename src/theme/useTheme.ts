import { useCallback, useEffect, useState } from 'react';

/** Two schemes, chosen outright. The first visit takes its lead from the system. */
export type ThemeChoice = 'light' | 'dark';

export const THEME_KEY = 'algorithmx:theme';

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function loadThemeChoice(): ThemeChoice {
  const raw = safeStorage()?.getItem(THEME_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  return systemPrefersDark() ? 'dark' : 'light';
}

/**
 * Stamps the choice on the root. The stylesheet only knows about the attribute,
 * so there is one palette to keep true rather than a media query and an
 * override drifting apart.
 */
export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = choice;
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(loadThemeChoice);

  useEffect(() => {
    applyTheme(choice);
    safeStorage()?.setItem(THEME_KEY, choice);
  }, [choice]);

  const cycle = useCallback(() => {
    /*
     * The colours cross fade rather than cutting. The class is what turns the
     * transition on, so it only ever runs on a deliberate switch and never on
     * the first paint or on an ordinary repaint.
     */
    const root = document.documentElement;
    root.classList.add('theme-turning');
    window.setTimeout(() => root.classList.remove('theme-turning'), 340);
    setChoice((c) => (c === 'dark' ? 'light' : 'dark'));
  }, []);

  return { choice, setChoice, cycle, resolved: choice };
}
