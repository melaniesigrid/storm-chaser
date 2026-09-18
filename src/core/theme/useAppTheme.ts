import { useColorScheme } from 'nativewind';

import { chrome, palette, type ColorScheme } from './tokens';

/**
 * Single read point for theme state. Screens use Tailwind `dark:` variants for
 * anything they can; this hook exists for native props (map style, status bar,
 * tab bar) that need a literal colour.
 */
export function useAppTheme() {
  const { colorScheme } = useColorScheme();
  const scheme: ColorScheme = colorScheme === 'light' ? 'light' : 'dark';

  return {
    scheme,
    isDark: scheme === 'dark',
    colors: chrome[scheme],
    palette,
  };
}
