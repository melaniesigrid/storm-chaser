import type { ChaseLevel } from '@/features/weather/model/types';

/**
 * The theme system.
 *
 * Pure data and pure types: no React, no I/O, no native modules, so the whole
 * contract is unit testable. `themes.test.ts` asserts that every theme defines
 * every token and that every text colour clears WCAG AA against the surface it
 * is drawn on. That test is the reason the old `chrome.dark.muted` bug (2.0:1)
 * cannot come back.
 *
 * Three themes, one contract. A screen never asks which theme is active; it
 * asks the active theme for a named token.
 */

export type ThemeName = 'skyward-day' | 'skyward-night' | 'field-card';

export const THEME_NAMES: readonly ThemeName[] = [
  'skyward-day',
  'skyward-night',
  'field-card',
] as const;

export interface ThemeColors {
  /** Flat background, and the fallback when a gradient cannot be drawn. */
  background: string;
  /**
   * Top to bottom atmosphere. Four stops rather than three: the third is the
   * haze band where sky meets ground, and it is what stops the Skyward
   * gradients reading as a flat two-colour wash. Field Card repeats one
   * value: it is flat by design.
   */
  backgroundGradient: readonly [string, string, string, string];
  /** Where each gradient stop lands. Same length as `backgroundGradient`. */
  backgroundGradientLocations: readonly [number, number, number, number];
  surface: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textMuted: string;
  /** Primary action fill, and the text colour that sits on top of it. */
  accent: string;
  onAccent: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  /** Tier colours used as FILLS: meter segments, map pins, badges. */
  tier: Readonly<Record<ChaseLevel, string>>;
  /** Tier colours used as TEXT on `surface`. Darkened to clear AA. */
  tierText: Readonly<Record<ChaseLevel, string>>;
}

export interface ThemeTypography {
  /** Headline face. This is what changes personality between themes. */
  display: string;
  displayLight: string;
  body: string;
  bodyMedium: string;
  bodySemibold: string;
  bodyBold: string;
  /** Always mono. Columns of figures have to line up in every theme. */
  mono: string;
  monoMedium: string;
  monoBold: string;
}

/**
 * The identity layer: the handful of values that belong to Storm Chaser itself
 * rather than to any one surface.
 *
 * Kept separate from `colors` on purpose. `colors` answers "what does a panel
 * look like in this theme"; `brand` answers "what do the mark, the ray and the
 * mascot look like in this theme". Volt is yellow because Volt is yellow, not
 * because yellow happens to be the accent — Skyward Day's accent is rust, and
 * pointing his shell at `accent` was exactly what made him the wrong character
 * on two themes out of three.
 */
export interface ThemeBrand {
  /**
   * Volt's shell, light to deep. Skyward paints him flat in the middle value;
   * Field Card runs all three as a gradient under its heavy outline.
   */
  voltShell: readonly [string, string, string];
  /** The chin shadow inside the shell: an inset bar along the bottom edge. */
  voltShade: string;
  /** Pupils. Dark on Skyward's bare shell, warm inside Field Card's visor. */
  voltEye: string;
  /** Volt's ambient lift, in each theme's own elevation language. */
  voltGlow: string;
  /**
   * The three-stop ray: under the wordmark, and in the exported icon SVGs.
   * Not used by the Monogram component, which paints flat plate and mark. Warm to
   * hot to deep, always left to right.
   */
  ray: readonly [string, string, string];
  /** The app-icon plate, and the bolt-and-monogram drawn on it. */
  monogramPlate: string;
  monogramMark: string;
  /**
   * Plate corner radius as a fraction of its size, so one number works at
   * 24px and at 512px. Field Card's mark is a hard square.
   */
  monogramRadius: number;
}

export interface Theme {
  name: ThemeName;
  label: string;
  description: string;
  isDark: boolean;
  colors: ThemeColors;
  type: ThemeTypography;
  brand: ThemeBrand;
  radius: { panel: number; control: number };
  /** Field Card draws hard 3px outlines; Skyward draws hairlines or none. */
  borderWidth: number;
  /** How a raised surface separates itself from the background. */
  elevation: 'soft' | 'hard' | 'glow';
}

const SKYWARD_TYPE: ThemeTypography = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayLight: 'BricolageGrotesque_200ExtraLight',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemibold: 'InstrumentSans_600SemiBold',
  bodyBold: 'InstrumentSans_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
};

const FIELD_CARD_TYPE: ThemeTypography = {
  ...SKYWARD_TYPE,
  // Archivo Black ships one weight, so the light display role falls back to the
  // heaviest body weight rather than pretending a 200 exists.
  display: 'ArchivoBlack_400Regular',
  displayLight: 'InstrumentSans_700Bold',
};

const skywardDay: Theme = {
  name: 'skyward-day',
  label: 'Skyward Day',
  description: 'Bright, atmospheric',
  isDark: false,
  colors: {
    background: '#F2F0E8',
    backgroundGradient: ['#6E9AD4', '#A9C3E4', '#E8E4DA', '#F7F4EC'],
    backgroundGradientLocations: [0, 0.42, 0.78, 1],
    surface: '#FFFFFF',
    surfaceSunken: '#EDEAE0',
    border: '#D6D2C6',
    text: '#14213A',
    textMuted: '#3A4761',
    accent: '#C4402E',
    onAccent: '#FFFFFF',
    tabBar: '#FFFFFF',
    tabActive: '#14213A',
    tabInactive: '#5B6472',
    tier: {
      dormant: '#5B6472',
      unsettled: '#4FD1C5',
      active: '#F5C242',
      severe: '#FF5A47',
      extreme: '#8E7CFF',
    },
    tierText: {
      dormant: '#4A5464',
      unsettled: '#0F7D72',
      active: '#8A5D00',
      severe: '#C4402E',
      extreme: '#5B3FC4',
    },
  },
  type: SKYWARD_TYPE,
  brand: {
    voltShell: ['#FFDE6A', '#FFC21F', '#E0A100'],
    voltShade: 'rgba(120, 82, 0, 0.16)',
    voltEye: '#14140F',
    voltGlow: 'rgba(20, 33, 58, 0.24)',
    ray: ['#FFB400', '#FF5A47', '#C4402E'],
    monogramPlate: '#14213A',
    monogramMark: '#FFB400',
    monogramRadius: 0.23,
  },
  radius: { panel: 24, control: 29 },
  borderWidth: 0,
  elevation: 'soft',
};

const skywardNight: Theme = {
  name: 'skyward-night',
  label: 'Skyward Night',
  description: 'Low light, night chasing',
  isDark: true,
  colors: {
    background: '#0B1026',
    backgroundGradient: ['#0B1026', '#1B2347', '#241F42', '#2A2140'],
    backgroundGradientLocations: [0, 0.5, 0.82, 1],
    surface: '#141B33',
    surfaceSunken: '#0D1226',
    border: '#2B3558',
    text: '#EDF1FA',
    textMuted: '#98A3C0',
    accent: '#FFB84D',
    onAccent: '#0B1026',
    tabBar: '#0B1026',
    tabActive: '#FFB84D',
    tabInactive: '#98A3C0',
    tier: {
      dormant: '#4A5470',
      unsettled: '#4FD1C5',
      active: '#FFC24D',
      severe: '#FF6B57',
      extreme: '#A78BFF',
    },
    tierText: {
      // Dormant has to lift well clear of the surface; the fill value is far
      // too dark to read as text.
      dormant: '#8D97B5',
      unsettled: '#4FD1C5',
      active: '#FFC24D',
      severe: '#FF6B57',
      extreme: '#A78BFF',
    },
  },
  type: SKYWARD_TYPE,
  brand: {
    // At night Volt powers down to a slate-blue shell rather than glaring
    // yellow out of a dark screen. His moods still light him right up.
    voltShell: ['#4C5892', '#3E4A7A', '#2E3861'],
    voltShade: 'rgba(0, 0, 0, 0.24)',
    voltEye: '#C3CCE4',
    voltGlow: 'rgba(142, 124, 255, 0.4)',
    ray: ['#FFC24D', '#FF6B57', '#A78BFF'],
    monogramPlate: '#141B33',
    monogramMark: '#FFB84D',
    monogramRadius: 0.23,
  },
  radius: { panel: 24, control: 29 },
  borderWidth: 1,
  elevation: 'glow',
};

const fieldCard: Theme = {
  name: 'field-card',
  label: 'Field Card',
  description: 'Bold, collectible',
  isDark: false,
  colors: {
    background: '#FFF8EC',
    backgroundGradient: ['#FFF8EC', '#FFF8EC', '#FFF8EC', '#FFF8EC'],
    backgroundGradientLocations: [0, 0.33, 0.66, 1],
    surface: '#FFFFFF',
    surfaceSunken: '#FFF8EC',
    border: '#14140F',
    text: '#14140F',
    textMuted: '#3F3E34',
    accent: '#F5C242',
    onAccent: '#14140F',
    tabBar: '#FFF8EC',
    tabActive: '#14140F',
    tabInactive: '#5A584A',
    tier: {
      dormant: '#5B6472',
      unsettled: '#4FD1C5',
      active: '#F5C242',
      severe: '#FF5A47',
      extreme: '#8E7CFF',
    },
    tierText: {
      dormant: '#4A5464',
      unsettled: '#0F7D72',
      active: '#8A5D00',
      severe: '#C4402E',
      extreme: '#5B3FC4',
    },
  },
  type: FIELD_CARD_TYPE,
  brand: {
    voltShell: ['#FFDE6A', '#FFC21F', '#E0A100'],
    voltShade: 'rgba(120, 82, 0, 0.26)',
    // Field Card gives him a black visor, so the pupils invert to read on it.
    voltEye: '#FFF8E6',
    voltGlow: '#14140F',
    ray: ['#F5C242', '#FF5A47', '#14140F'],
    monogramPlate: '#F5C242',
    monogramMark: '#14140F',
    // Signage, not software: the Field Card mark keeps its corners.
    monogramRadius: 0,
  },
  radius: { panel: 20, control: 28 },
  borderWidth: 3,
  elevation: 'hard',
};

export const THEMES: Readonly<Record<ThemeName, Theme>> = {
  'skyward-day': skywardDay,
  'skyward-night': skywardNight,
  'field-card': fieldCard,
};

export const DEFAULT_THEME: ThemeName = 'skyward-day';

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && THEME_NAMES.includes(value as ThemeName);
}

export function getTheme(name: ThemeName): Theme {
  return THEMES[name];
}

/**
 * Which Skyward variant the system appearance implies. Used only when the user
 * has never made an explicit choice; once they pick, their choice wins and the
 * OS setting stops being consulted.
 *
 * Takes a loose string because React Native reports `'unspecified'` on Android
 * alongside the usual `'light' | 'dark' | null`. Anything that is not an
 * explicit `'dark'` means day.
 */
export function themeForColorScheme(scheme: string | null | undefined): ThemeName {
  return scheme === 'dark' ? 'skyward-night' : 'skyward-day';
}
