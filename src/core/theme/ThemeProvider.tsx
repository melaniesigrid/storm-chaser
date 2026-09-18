import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  DEFAULT_THEME,
  getTheme,
  themeForColorScheme,
  type Theme,
  type ThemeName,
} from './themes';
import { themeStore as defaultStore, type ThemeStore } from './themeStore';

export interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  /** False until the stored preference has been read, so nothing flashes. */
  ready: boolean;
  /** True once the user has chosen explicitly; system appearance stops applying. */
  isExplicit: boolean;
  setTheme: (name: ThemeName) => void;
  /** Drops the stored choice and returns to following system appearance. */
  followSystem: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Injectable for tests. */
  store?: ThemeStore;
}

/**
 * Owns which theme is active.
 *
 * Until the user picks one, the two Skyward variants track the OS light/dark
 * setting, which is what someone expects on first launch. The moment they
 * choose in onboarding or Settings, that choice wins permanently and the OS
 * setting stops being consulted; a field app should not flip to a light theme
 * at sunrise while someone is out chasing.
 *
 * Writes are optimistic: the UI switches immediately and persistence catches
 * up. A failed write costs the preference on next launch, never the tap.
 */
export function ThemeProvider({ children, store = defaultStore }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [stored, setStored] = useState<ThemeName | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await store.load();
      if (cancelled) return;
      // A storage failure is not worth blocking launch over: fall through to
      // system appearance and let the user re-pick.
      if (result.ok) setStored(result.value);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [store]);

  const themeName: ThemeName = stored ?? themeForColorScheme(systemScheme) ?? DEFAULT_THEME;

  const setTheme = useCallback(
    (name: ThemeName) => {
      setStored(name);
      void store.save(name);
    },
    [store],
  );

  const followSystem = useCallback(() => {
    setStored(null);
    void store.clear();
  }, [store]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: getTheme(themeName),
      themeName,
      ready,
      isExplicit: stored !== null,
      setTheme,
      followSystem,
    }),
    [themeName, ready, stored, setTheme, followSystem],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
