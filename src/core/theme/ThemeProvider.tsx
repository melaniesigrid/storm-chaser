import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useLastKnownPosition } from '@/features/location/lastKnownPosition';

import { resolveAutoTheme } from './resolveAutoTheme';
import {
  AUTO_PREFERENCE,
  themeStore as defaultStore,
  type ThemePreference,
  type ThemeStore,
} from './themeStore';
import {
  DEFAULT_THEME,
  getTheme,
  themeForColorScheme,
  type Theme,
  type ThemeName,
} from './themes';

/**
 * How often the auto preference re-asks the sky.
 *
 * A minute is far finer than sunset needs and still costs nothing: the
 * resolution is arithmetic on a date and a coordinate, with no I/O. It exists
 * so the theme actually turns over while the app is open, rather than only on
 * the next cold start.
 */
const AUTO_TICK_MS = 60_000;

export interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  /** False until the stored preference has been read, so nothing flashes. */
  ready: boolean;
  /** True once the user has chosen explicitly; system appearance stops applying. */
  isExplicit: boolean;
  /**
   * What the user chose, which is not always which theme is showing. Under
   * `'auto'` the active `themeName` moves with the sun while this stays put.
   */
  preference: ThemePreference | null;
  /** True when `'auto'` is chosen but no position fix has arrived yet. */
  isAwaitingPosition: boolean;
  setTheme: (preference: ThemePreference) => void;
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
  const [stored, setStored] = useState<ThemePreference | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Module state, not a query: this provider is mounted ABOVE the query client,
  // so anything it reads has to come from somewhere that does not need one.
  const coordinates = useLastKnownPosition();

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

  const isAuto = stored === AUTO_PREFERENCE;

  useEffect(() => {
    if (!isAuto) return;

    const id = setInterval(() => setNow(new Date()), AUTO_TICK_MS);
    return () => clearInterval(id);
  }, [isAuto]);

  // Auto falls back to system appearance rather than to a fixed theme: with no
  // fix yet, the phone's own light/dark setting is the better guess at the sky
  // than an assumption of daylight.
  const fromSystem = themeForColorScheme(systemScheme) ?? DEFAULT_THEME;
  const fromSky = isAuto ? resolveAutoTheme(now, coordinates) : null;
  const themeName: ThemeName = isAuto ? (fromSky ?? fromSystem) : (stored ?? fromSystem);

  const setTheme = useCallback(
    (preference: ThemePreference) => {
      setStored(preference);
      // Resolve from the current instant the moment auto is chosen, rather than
      // waiting up to a minute for the first tick.
      if (preference === AUTO_PREFERENCE) setNow(new Date());
      void store.save(preference);
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
      preference: stored,
      isAwaitingPosition: isAuto && fromSky === null,
      setTheme,
      followSystem,
    }),
    [themeName, ready, stored, isAuto, fromSky, setTheme, followSystem],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
