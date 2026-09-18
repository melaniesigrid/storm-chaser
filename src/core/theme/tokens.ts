/**
 * Raw colour values for the places that cannot use a Tailwind class:
 * the map style, the status bar, native tab bar options and SVG fills.
 * Keep in sync with tailwind.config.js.
 */
export const palette = {
  ink900: '#05070B',
  ink800: '#080B10',
  ink700: '#11161F',
  ink600: '#1A212C',
  ink500: '#27303D',
  ink400: '#3A4553',
  bone50: '#FBF9F4',
  bone100: '#F2EEE4',
  bone200: '#E2DCCC',
  bone300: '#C4BCA8',
  lightning: '#F5C242',
  supercell: '#FF5A47',
  radar: '#4FD1C5',
  funnel: '#8E7CFF',
} as const;

export type ColorScheme = 'light' | 'dark';

export const chrome = {
  dark: {
    background: palette.ink800,
    surface: palette.ink700,
    border: palette.ink500,
    text: palette.bone50,
    muted: palette.ink400,
    tabBar: palette.ink900,
  },
  light: {
    background: palette.bone50,
    surface: '#FFFFFF',
    border: palette.bone200,
    text: palette.ink800,
    muted: '#6B7280',
    tabBar: '#FFFFFF',
  },
} satisfies Record<ColorScheme, Record<string, string>>;
