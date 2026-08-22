import { useCallback, useEffect, useState } from 'react';

/** What the reader picked. `system` follows the operating system as it changes. */
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_KEY = 'algorithmx:theme';

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadThemeChoice(): ThemeChoice {
  const raw = safeStorage()?.getItem(THEME_KEY);
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolves the choice and stamps it on the root. The stylesheet only knows
 * about the attribute, so the operating system's preference and the reader's
 * own choice arrive by the same door and there is one palette to maintain.
 */
export function applyTheme(choice: ThemeChoice): void {
  const dark = choice === 'dark' || (choice === 'system' && systemPrefersDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(loadThemeChoice);

  useEffect(() => {
    applyTheme(choice);
    safeStorage()?.setItem(THEME_KEY, choice);
  }, [choice]);

  // Following the system means following it while the page is open
  useEffect(() => {
    if (choice !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  const cycle = useCallback(() => {
    setChoice((c) => (c === 'system' ? 'dark' : c === 'dark' ? 'light' : 'system'));
  }, []);

  const resolved: 'light' | 'dark' =
    choice === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : choice;

  return { choice, setChoice, cycle, resolved };
}
