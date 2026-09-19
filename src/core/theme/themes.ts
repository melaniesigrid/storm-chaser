import type { ChaseLevel } from '@/features/weather/model/types';

/**
 * The theme system.
 *
 * Pure data and pure types: no React, no I/O, no native modules, so the whole
 * contract is unit testable. `theme.test.ts` asserts that every theme defines
 * every token, that every text colour clears WCAG AA against the surface it is
 * drawn on, and that no theme's weather can flash past WCAG 2.3.1. Those tests
 * are the reason the old `chrome.dark.muted` bug (2.0:1) cannot come back.
 *
 * (The totality half of that claim was written here long before it was true --
 * until the atmosphere and motion groups landed, only the TypeScript interface
 * enforced it and no test did. Worth remembering that a comment asserting a
 * test exists is not a test.)
 *
 * Three display faces, one contract. A screen never asks which theme is
 * active; it asks the active theme for a named token. That now includes what
 * the sky does and how a press feels, not only what colour things are.
 *
 * The faces come from the three wordmark boards the brand exploration
 * produced, and each one brings its whole design with it rather than a palette
 * swap:
 *
 *   Bricolage Grotesque   Skyward Day and Skyward Night. 200 against 800
 *                         inside one word. THE ONLY FACE WHOSE BACKGROUND IS
 *                         GENERATED FROM THE WEATHER -- sun shafts by day,
 *                         rain and lightning by night -- which is also why it
 *                         is the only one auto mode can resolve to.
 *   Anton                 Broadcast. One weight, so light and heavy are the
 *                         same number and the lockup holds itself together on
 *                         size and colour the way a lower third does. Flat
 *                         near-black, #FFD400, hard white rules, no sky.
 *   Big Shoulders         Field Card. Condensed 900 over a real 300, cream
 *                         paper, ink outlines, hard offset. Also no sky.
 *
 * Two themes share Bricolage because they are the same design at two times of
 * day, which is what the sun switches between. Broadcast and Field Card are
 * taste, not weather, so they are still and are never chosen for you.
 */

export type ThemeName = 'skyward-day' | 'skyward-night' | 'broadcast' | 'field-card';

export const THEME_NAMES: readonly ThemeName[] = [
  'skyward-day',
  'skyward-night',
  'broadcast',
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
  /**
   * Optional palette for cards that want to differ from one another rather than
   * repeat one surface.
   *
   * Only Field Card defines it. That theme's argument is that a report is a
   * collectible card, and a run of identical white rectangles is the one place
   * the argument visibly failed. Every other theme leaves it undefined and gets
   * `surface`, so this is an opt-in a theme makes rather than a behaviour
   * components have to switch on a theme name to avoid.
   *
   * Values must carry `text` at AA; the theme test asserts it.
   */
  cardTints?: readonly string[];
  border: string;
  text: string;
  textMuted: string;
  /** Primary action fill, and the text colour that sits on top of it. */
  accent: string;
  onAccent: string;
  /**
   * The camera screen's ground, and the text drawn on it. A viewfinder wants
   * near-black in every theme, but not the SAME near-black: Skyward's is blue,
   * Field Card's is its own ink. These exist because `capture.tsx` used to
   * hardcode three hex values and was the one screen the token contract did not
   * reach.
   */
  cameraGround: string;
  onCameraGround: string;
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
  /**
   * Multiplier on the negative tracking the display sizes are set with.
   *
   * The type scale tightens its display sizes because Bricolage and Big
   * Shoulders are drawn loose enough to want it. Anton is not: it is already a
   * condensed face with almost no side bearing, and pulling it tighter on top
   * of that runs the glyphs into each other and past the edge of the box the
   * platform measured for them, which is what was clipping letters off the
   * ends of headings in Broadcast. A theme that does not want the tightening
   * says so here rather than every headline in the app special-casing a font.
   */
  displayTracking: number;
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

/**
 * One drifting parallax band.
 *
 * `scale` is the band's principal dimension in dp: streak length for rain, beam
 * width for a sun shaft. One field rather than two named ones, because the
 * renderer already knows which it is drawing from `atmosphere.kind`.
 */
export interface AtmosphereLayer {
  /** Relative speed. 1 is the nearest, fastest band. */
  speed: number;
  /** Degrees from vertical, before the real wind bearing is applied. */
  angle: number;
  opacity: number;
  scale: number;
}

export interface AtmosphereLightning {
  enabled: boolean;
  /**
   * The floor between two blooms. This is a SAFETY value, not a style one: it
   * is what keeps the flash rate under the WCAG 2.3.1 threshold no matter how
   * severe the chase level gets.
   */
  minGapMs: number;
  maxGapMs: number;
  bloom: string;
}

export interface AtmosphereClouds {
  count: number;
  speed: number;
  /** Gaussian blur radius. Android implements this one; it is not free. */
  blur: number;
  tint: string;
}

export interface AtmosphereShimmer {
  enabled: boolean;
  /** Peak displacement in dp. */
  amplitude: number;
  periodMs: number;
}

/**
 * What the sky does. Data, exactly like colour is data, so a screen never asks
 * which theme is active -- it asks the active theme what its sky does.
 *
 * Every member is defined by every theme. Field Card says `kind: 'none'` and
 * writes its zeros out loud rather than omitting the fields, so stillness reads
 * as a decision rather than as something nobody got round to.
 */
export interface ThemeAtmosphere {
  kind: 'rain' | 'sun' | 'none';
  layers: readonly AtmosphereLayer[];
  /**
   * The colour the bands are drawn in. Separate from their opacity, because
   * contrast is a property of what reaches the eye: text sitting on the
   * gradient is really sitting on this tint composited over it, and
   * `theme.test.ts` checks it at the densest band.
   */
  layerTint: string;
  lightning: AtmosphereLightning;
  clouds: AtmosphereClouds;
  shimmer: AtmosphereShimmer;
}

/**
 * The limits that keep the atmosphere layer from hurting anyone.
 *
 * These live in the token layer rather than in a branch inside the renderer for
 * one reason: a token can be asserted by a test, and a branch can be forgotten.
 * `theme.test.ts` checks every theme against the WCAG 2.3.1 thresholds.
 */
export interface MotionSafety {
  /** Bloom rate ceiling. WCAG 2.3.1 allows 3/s; this sits far under it. */
  flashMaxPerSecond: number;
  /** Peak relative-luminance change, 0 to 1. The general-flash line is 0.10. */
  flashLuminanceDelta: number;
  /** Fraction of the viewport the bloom may cover. Above 0.25 it is a flash. */
  flashAreaFraction: number;
  /** What the sky becomes when the OS asks for reduced motion. */
  reducedMotionVariant: 'static-gradient';
  /** Storm haptics are opt-in, never opt-out. */
  hapticsDefault: boolean;
  /** The layer is decoration; it must not reach the screen reader. */
  ariaHidden: boolean;
}

/**
 * How this theme moves.
 *
 * Skyward is atmospheric: things ease, and the weather is ambient. Field Card
 * is mechanical: nothing drifts, and every movement is a thing being pressed or
 * stamped. Broadcast cuts: no easing curve and no stamp, just the next frame,
 * the way a bulletin takes the next lower third. Those differences are what
 * make them three themes rather than three palettes.
 */
export interface ThemeMotion {
  language: 'atmospheric' | 'mechanical' | 'broadcast';
  /** 1 means this theme does not scale on press; it answers some other way. */
  pressScale: number;
  pressDurationMs: number;
  pressEasing: 'inOut' | 'linear' | 'snap';
  revealKind: 'rise' | 'stamp' | 'cut';
  /**
   * A theme change is a context swap -- faces, borders and radii all change at
   * once -- so it cannot be cross-faded without rendering two full trees. Both
   * transitions are therefore overlay-covered: something opaque passes over the
   * swap. `wipe` travels; `dissolve` does not.
   */
  manualTransition: 'wipe' | 'registration';
  autoTransition: 'dissolve';
  autoTransitionMs: number;
  safety: MotionSafety;
}

/**
 * How a panel sits in front of the sky.
 *
 * Only Skyward turns this on, and only Skyward can: glass is an argument that
 * there is something behind the card worth seeing, and the two Skyward
 * variants are the only themes with a moving sky behind one. Broadcast paints
 * on near-black and Field Card is printed stock -- neither has a background to
 * let through, so both declare `enabled: false`.
 *
 * `fill` is not the surface colour with an alpha bolted on. It is tuned so the
 * composite over the WORST stop of that theme's own gradient still clears AA
 * for body and muted text, which is why the alpha is high enough to read as
 * frost rather than as a tint -- a 30%-alpha card looks better in a screenshot
 * and is unreadable over weather.
 *
 * Every field carries a real value in every theme, switched off or not, so
 * nothing downstream has to handle a missing one.
 */
export interface ThemeGlass {
  enabled: boolean;
  /** Translucent stand-in for `colors.surface` when the frost is on. */
  fill: string;
  /**
   * The sheen raking down from the top edge, as two stops. Light hits a pane
   * of glass at its top edge; without this the fill is just a transparent
   * rectangle, which is the difference between frosted glass and low opacity.
   */
  sheen: readonly [string, string];
  /** The lit hairline along the top edge. */
  rim: string;
  /** The shaded hairline along the bottom, which is what gives it thickness. */
  shade: string;
}

export interface Theme {
  name: ThemeName;
  label: string;
  description: string;
  isDark: boolean;
  colors: ThemeColors;
  type: ThemeTypography;
  brand: ThemeBrand;
  atmosphere: ThemeAtmosphere;
  glass: ThemeGlass;
  motion: ThemeMotion;
  radius: { panel: number; control: number };
  /** Field Card draws hard 3px outlines; Skyward draws hairlines or none. */
  borderWidth: number;
  /** How a raised surface separates itself from the background. */
  elevation: 'soft' | 'hard' | 'glow';
}

/**
 * The safety floor, shared by all three themes.
 *
 * A theme may be calmer than this; none may be louder. Kept as one object so
 * there is a single place to tighten it, and so a theme that disagreed would be
 * visibly disagreeing rather than quietly drifting.
 */
const MOTION_SAFETY: MotionSafety = {
  // At most one bloom every three and a bit seconds. WCAG 2.3.1 permits three
  // per second, so this sits an order of magnitude inside the line. The night
  // theme's `minGapMs` is held to the period this implies, and a test checks
  // the two agree: a rate ceiling the cadence can outrun is decoration.
  flashMaxPerSecond: 0.3,
  // The general-flash threshold is a 0.10 relative-luminance change.
  flashLuminanceDelta: 0.08,
  // Above a quarter of the viewport a bright change counts as a flash, so the
  // bloom is confined to the top band of the sky.
  flashAreaFraction: 0.22,
  reducedMotionVariant: 'static-gradient',
  hapticsDefault: false,
  ariaHidden: true,
};

const SKYWARD_MOTION: ThemeMotion = {
  language: 'atmospheric',
  pressScale: 0.97,
  pressDurationMs: 140,
  pressEasing: 'inOut',
  revealKind: 'rise',
  manualTransition: 'wipe',
  autoTransition: 'dissolve',
  autoTransitionMs: 1200,
  safety: MOTION_SAFETY,
};

/**
 * Field Card does not ease and does not drift. A press drops the hard offset
 * shadow to nothing in one frame-ish snap, which is the card physically sitting
 * down on the page; it does not shrink. Its theme change is a print
 * registration slip rather than a weather front.
 */
const FIELD_CARD_MOTION: ThemeMotion = {
  language: 'mechanical',
  pressScale: 1,
  pressDurationMs: 60,
  pressEasing: 'snap',
  revealKind: 'stamp',
  manualTransition: 'registration',
  autoTransition: 'dissolve',
  autoTransitionMs: 1200,
  safety: MOTION_SAFETY,
};

/**
 * Broadcast cuts. A bulletin does not ease between lower thirds, it takes the
 * next one, so the press is near-instant and linear and a reveal is the same
 * hard cut rather than a rise or a stamp. `pressScale` sits just under 1: the
 * control acknowledges the touch without the bounce Skyward gives it.
 */
const BROADCAST_MOTION: ThemeMotion = {
  language: 'broadcast',
  pressScale: 0.99,
  pressDurationMs: 80,
  pressEasing: 'linear',
  revealKind: 'cut',
  manualTransition: 'wipe',
  autoTransition: 'dissolve',
  autoTransitionMs: 1200,
  safety: MOTION_SAFETY,
};

const SKYWARD_TYPE: ThemeTypography = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayLight: 'BricolageGrotesque_200ExtraLight',
  displayTracking: 1,
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemibold: 'InstrumentSans_600SemiBold',
  bodyBold: 'InstrumentSans_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
};

/**
 * Anton ships exactly one weight. Rather than fake a light role from a body
 * face, both display roles resolve to the same font -- which is the point of
 * the face here: the lockup separates on size and colour, never on weight.
 */
const BROADCAST_TYPE: ThemeTypography = {
  ...SKYWARD_TYPE,
  display: 'Anton_400Regular',
  displayLight: 'Anton_400Regular',
  // Anton sets its own tracking. Nothing is taken out of it.
  displayTracking: 0,
};

/**
 * Big Shoulders Display carries a real 100-to-900 range, so unlike the Archivo
 * Black it replaced, its light display role is the same condensed face at 300
 * rather than a different family standing in. The Field Card lockup can finally
 * set one word in two weights the way the Bricolage one does.
 */
const FIELD_CARD_TYPE: ThemeTypography = {
  ...SKYWARD_TYPE,
  display: 'BigShouldersDisplay_900Black',
  displayLight: 'BigShouldersDisplay_300Light',
};

const skywardDay: Theme = {
  name: 'skyward-day',
  label: 'Skyward Day',
  description: 'Bright, atmospheric',
  isDark: false,
  colors: {
    background: '#F2F0E8',
    backgroundGradient: ['#8DB0DF', '#A9C3E4', '#E8E4DA', '#F7F4EC'],
    backgroundGradientLocations: [0, 0.42, 0.78, 1],
    surface: '#FFFFFF',
    surfaceSunken: '#EDEAE0',
    border: '#D6D2C6',
    text: '#14213A',
    textMuted: '#33405A',
    accent: '#C4402E',
    onAccent: '#FFFFFF',
    cameraGround: '#05070B',
    onCameraGround: '#F2F6FA',
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
  /**
   * The calm before. One slow raking shaft whose angle comes from the actual
   * hour, a cumulus bank drifting at a fraction of its speed, and a shimmer
   * confined to the haze band -- the third gradient stop, which is the horizon.
   *
   * The shimmer is an opacity-and-translate oscillation rather than a real
   * turbulence filter: `react-native-svg` ships seven filter primitives on
   * Android and neither FeTurbulence nor FeDisplacementMap is among them, so a
   * filter-based shimmer would render nothing on half the devices.
   */
  atmosphere: {
    kind: 'sun',
    layers: [{ speed: 0.06, angle: 28, opacity: 0.12, scale: 160 }],
    layerTint: '#FFF4D6',
    lightning: { enabled: false, minGapMs: 0, maxGapMs: 0, bloom: '#FFFFFF' },
    clouds: { count: 2, speed: 0.04, blur: 28, tint: '#FFFFFF' },
    shimmer: { enabled: true, amplitude: 3, periodMs: 5200 },
  },
  /**
   * Daylight frost. The fill is white at 0.74, which over the darkest stop of
   * this theme's own gradient (#8DB0DF, the top of the sky) composites to
   * roughly #DCE7F5 -- ink at 13:1 and muted copy comfortably past AA, while
   * the cumulus bank still moves visibly behind the card.
   *
   * The sheen is white falling to nothing, and the rim is near-opaque white:
   * on a bright day the lit edge of a pane is the brightest thing on it.
   */
  glass: {
    enabled: true,
    fill: 'rgba(255, 255, 255, 0.74)',
    sheen: ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0)'],
    rim: 'rgba(255, 255, 255, 0.92)',
    shade: 'rgba(20, 33, 58, 0.10)',
  },
  motion: SKYWARD_MOTION,
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
    textMuted: '#AEB8D2',
    accent: '#FFB84D',
    onAccent: '#0B1026',
    cameraGround: '#05070B',
    onCameraGround: '#F2F6FA',
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
  /**
   * Driving into it. Three rain bands at different speeds and opacities, which
   * is what gives the sky depth: one band reads as a screensaver, three read as
   * weather with distance in it. The angle here is a resting value -- the
   * renderer leans it to the real wind bearing.
   *
   * `minGapMs` is not a style choice. It is the safety floor that keeps the
   * bloom under the WCAG 2.3.1 flash rate however severe the storm gets: the
   * cadence tightens toward it as the chase level rises and never past it. Its
   * value sits at or above the period implied by `safety.flashMaxPerSecond`
   * (3333ms at 0.3/s, rounded up to 3400), and a test asserts that inequality
   * so neither can drift under the other.
   */
  atmosphere: {
    kind: 'rain',
    layers: [
      { speed: 1, angle: 14, opacity: 0.28, scale: 64 },
      { speed: 0.62, angle: 12, opacity: 0.18, scale: 42 },
      { speed: 0.34, angle: 10, opacity: 0.1, scale: 26 },
    ],
    layerTint: '#8FA3C8',
    lightning: { enabled: true, minGapMs: 3400, maxGapMs: 14000, bloom: '#9FD4FF' },
    clouds: { count: 2, speed: 0.05, blur: 36, tint: '#2A2140' },
    shimmer: { enabled: false, amplitude: 0, periodMs: 0 },
  },
  /**
   * Night frost, and the harder of the two to get right: a dark pane over a
   * dark sky disappears. The fill is the surface navy at 0.68 -- over the
   * lightest stop (#2A2140) it composites to about #1B1D37, close enough to
   * the opaque surface that every contrast guarantee still holds, and open
   * enough that rain and a lightning bloom read through it.
   *
   * The sheen and rim are a cold blue-white rather than plain white, because
   * on this sky the light source is the bloom, not the sun.
   */
  glass: {
    enabled: true,
    fill: 'rgba(20, 27, 51, 0.68)',
    sheen: ['rgba(159, 212, 255, 0.14)', 'rgba(159, 212, 255, 0)'],
    rim: 'rgba(186, 209, 255, 0.34)',
    shade: 'rgba(5, 7, 14, 0.42)',
  },
  motion: SKYWARD_MOTION,
  radius: { panel: 24, control: 29 },
  borderWidth: 1,
  elevation: 'glow',
};

/**
 * Broadcast. Anton, #FFD400 and hard white rules on near-black, taken from the
 * High-Vis board and the first wordmark direction.
 *
 * The theme that proves the contract, because it is the one that refuses the
 * house style twice over. Its gradient is four copies of one value: a bulletin
 * graphic sits on a flat key, not on a sky, and writing the repeat out loud
 * says that flatness is the design rather than a stop somebody forgot. Its
 * atmosphere is `none` for the same reason Field Card's is -- the weather
 * belongs to Bricolage, and a theme that drew rain here would be borrowing
 * another face's argument.
 *
 * `radius` is zero throughout and `borderWidth` is 4: every panel is a block
 * with a white rule around it, which is where all of its hierarchy comes from
 * now that it has neither elevation nor a curve to spend.
 */
const broadcast: Theme = {
  name: 'broadcast',
  label: 'Broadcast',
  description: 'High-vis, one voice',
  isDark: true,
  colors: {
    background: '#07090E',
    // Flat by decision, not by omission. Four stops because the contract says
    // four; one value because a key is a key.
    backgroundGradient: ['#07090E', '#07090E', '#07090E', '#07090E'],
    backgroundGradientLocations: [0, 0.33, 0.66, 1],
    surface: '#12161D',
    surfaceSunken: '#05070B',
    // The rule, not a hairline. Broadcast separates planes with 4px of white.
    border: '#FFFFFF',
    text: '#FFFFFF',
    textMuted: '#C2C7CF',
    accent: '#FFD400',
    onAccent: '#07090E',
    cameraGround: '#000000',
    onCameraGround: '#FFFFFF',
    tabBar: '#07090E',
    tabActive: '#FFD400',
    tabInactive: '#A8B0BC',
    tier: {
      dormant: '#5B6472',
      unsettled: '#4FD1C5',
      active: '#FFD400',
      severe: '#FF5A47',
      extreme: '#8E7CFF',
    },
    tierText: {
      // Lifted off the fills: on a near-black surface the fill values for
      // dormant and severe are too dark to read as type.
      dormant: '#A8B0BC',
      unsettled: '#4FD1C5',
      active: '#F5C242',
      severe: '#FF7A69',
      extreme: '#A99BFF',
    },
  },
  type: BROADCAST_TYPE,
  brand: {
    // The one theme where Volt is dressed for the job rather than for the sky:
    // safety yellow, the same value as the accent, because on a bulletin the
    // mascot IS signage.
    voltShell: ['#FFE04D', '#FFD400', '#C9A600'],
    voltShade: 'rgba(90, 72, 0, 0.3)',
    voltEye: '#07090E',
    voltGlow: 'rgba(255, 212, 0, 0.35)',
    ray: ['#FFD400', '#FF5A47', '#8E7CFF'],
    monogramPlate: '#07090E',
    monogramMark: '#FFD400',
    // Zero, like every other corner in this theme.
    monogramRadius: 0,
  },
  atmosphere: {
    kind: 'none',
    layers: [],
    layerTint: '#07090E',
    lightning: { enabled: false, minGapMs: 0, maxGapMs: 0, bloom: '#07090E' },
    clouds: { count: 0, speed: 0, blur: 0, tint: '#07090E' },
    shimmer: { enabled: false, amplitude: 0, periodMs: 0 },
  },
  // Off. A bulletin graphic is opaque -- you cannot see the studio through the
  // lower third -- and there is no sky behind this one to let through anyway.
  glass: {
    enabled: false,
    fill: '#0E1013',
    sheen: ['rgba(255, 212, 0, 0)', 'rgba(255, 212, 0, 0)'],
    rim: '#FFFFFF',
    shade: '#000000',
  },
  motion: BROADCAST_MOTION,
  radius: { panel: 0, control: 0 },
  borderWidth: 4,
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
    /**
     * Six card stocks, cycled by report id so a card keeps its colour for life.
     *
     * Each is a tint of a hue the theme already uses -- the accent yellow, the
     * four tier colours, and plain stock -- rather than six new hues, so the
     * run reads as one set rather than as a swatch book. The severity rail
     * stays the saturated tier colour on top of them, which is what keeps the
     * tint decorative and the rail informative.
     */
    cardTints: [
      // Twelve stocks, not six. A run of reports is meant to read as a handful
      // of collected cards, and at six the repeat was visible inside one
      // screenful -- which made the palette look like a bug rather than a
      // print shop. Every value is a light stock carrying the theme's ink
      // (#14140F) far clear of AA; the theme test holds the whole list to it.
      '#FFFFFF',
      '#FFEFC2',
      '#CFEDE8',
      '#FFD9D2',
      '#E4DCFF',
      '#F4EAD7',
      '#CFE4FF',
      '#DDEFC8',
      '#FFE0C2',
      '#FFD8EA',
      '#D6F2FB',
      '#E8E6DF',
    ],
    border: '#14140F',
    text: '#14140F',
    textMuted: '#3F3E34',
    accent: '#F5C242',
    onAccent: '#14140F',
    // Field Card's viewfinder is its own ink, not Skyward's blue-black.
    cameraGround: '#14140F',
    onCameraGround: '#FFF8EC',
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
  /**
   * Nothing moves. This is the theme's whole argument, so it is written out
   * rather than left as an absence: `kind: 'none'`, no bands, no lightning, no
   * cloud, no shimmer. Field Card is print, and print does not drift.
   *
   * Every field still carries a real colour even where it is switched off, so
   * nothing downstream has to special-case a missing or transparent value.
   *
   * Its motion budget goes entirely into `motion`, where a press drops the hard
   * offset shadow in one snap and a reveal stamps rather than rises.
   */
  atmosphere: {
    kind: 'none',
    layers: [],
    layerTint: '#FFF8EC',
    lightning: { enabled: false, minGapMs: 0, maxGapMs: 0, bloom: '#FFF8EC' },
    clouds: { count: 0, speed: 0, blur: 0, tint: '#FFF8EC' },
    shimmer: { enabled: false, amplitude: 0, periodMs: 0 },
  },
  // Off, and not a near miss: card stock is not translucent.
  glass: {
    enabled: false,
    fill: '#FFFFFF',
    sheen: ['rgba(20, 20, 15, 0)', 'rgba(20, 20, 15, 0)'],
    rim: '#14140F',
    shade: '#14140F',
  },
  motion: FIELD_CARD_MOTION,
  radius: { panel: 20, control: 28 },
  borderWidth: 3,
  elevation: 'hard',
};

export const THEMES: Readonly<Record<ThemeName, Theme>> = {
  'skyward-day': skywardDay,
  'skyward-night': skywardNight,
  broadcast,
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
