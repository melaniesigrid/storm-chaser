import type { ThemeMotion } from '@/core/theme/themes';

/**
 * The choreography of the mark, as data.
 *
 * Pure numbers with no React and no native modules, for the same reason the
 * palette is pure data: a component's hardcoded `420` cannot be asserted, and
 * the one property that actually matters here -- that the launch animation
 * never becomes a wait -- is a property of the numbers, not of the component
 * drawing them. `launchSequence.test.ts` holds every language to the ceiling.
 *
 * Each theme strikes the way it moves everywhere else. Skyward eases the bolt
 * down, Field Card stamps it, Broadcast cuts to it the way a bulletin cuts to
 * the next lower third. Three themes, not three palettes -- that claim has to
 * survive contact with the mark too.
 */

export type MotionLanguage = ThemeMotion['language'];

/** The bolt's own drop. Used by the Monogram wherever it strikes. */
export interface StrikeTiming {
  delayMs: number;
  durationMs: number;
}

/**
 * The weather the strike brings with it.
 *
 * Derived from the timings above rather than declared beside them, so the sky
 * cannot light up before the bolt has landed and the rain cannot outlive the
 * overlay it is falling through. Nothing here adds to `totalMs`: the launch
 * already spends its last beats holding and fading a finished mark, and this
 * is what happens in that time instead of nothing.
 */
export interface LaunchWeatherTiming {
  /** The moment of impact, measured from the overlay's first frame. */
  flashAtMs: number;
  /** How long the bloom takes to fall back to nothing. */
  flashMs: number;
  /** When the first drop starts falling. */
  rainAtMs: number;
  /** How long it rains. It stops when the curtain does. */
  rainMs: number;
}

export interface LaunchTiming {
  /** The plate easing up under the bolt. Zero where the theme cuts. */
  plateMs: number;
  strike: StrikeTiming;
  weather: LaunchWeatherTiming;
  /** The beat the finished mark is allowed to hold before it leaves. */
  holdMs: number;
  /** The overlay's exit. Zero where the theme cuts. */
  fadeMs: number;
  /** When the overlay unmounts, measured from its first frame. */
  totalMs: number;
}

/**
 * The hard limit on the whole launch animation.
 *
 * A brand moment that outlives someone's patience is not a brand moment, it is
 * a loading screen with an opinion. Anything over about a second reads as the
 * app being slow rather than as the app having a mark, and the person paid for
 * that second before they saw a single forecast.
 */
export const LAUNCH_CEILING_MS = 1200;

const STRIKE: Record<MotionLanguage, StrikeTiming> = {
  atmospheric: { delayMs: 140, durationMs: 420 },
  // A stamp lands: short travel, and it is over the moment it arrives.
  mechanical: { delayMs: 90, durationMs: 220 },
  // Not an easing curve, just the next frame. 140ms is the least travel that
  // still reads as a strike rather than as a glitch.
  broadcast: { delayMs: 60, durationMs: 140 },
};

const PLATE_MS: Record<MotionLanguage, number> = {
  atmospheric: 300,
  mechanical: 160,
  broadcast: 0,
};

const HOLD_MS: Record<MotionLanguage, number> = {
  atmospheric: 240,
  mechanical: 280,
  // Broadcast spends nothing on the approach and nothing on the exit, so it
  // can afford to let the finished mark actually sit there.
  broadcast: 360,
};

/**
 * The longest a launch bloom may last, before the hold cuts it shorter.
 *
 * It is a decay, not a strobe: one bloom, once, on an overlay that exists for
 * under a second. `MotionSafety.flashLuminanceDelta` is what keeps it legal;
 * this is only what keeps it brief.
 */
const FLASH_MS = 260;

const FADE_MS: Record<MotionLanguage, number> = {
  atmospheric: 320,
  mechanical: 180,
  broadcast: 0,
};

/**
 * Stillness, for whoever asked the OS for it.
 *
 * Reduced motion is not "no mark". The mark still appears and still gets its
 * beat; nothing travels, and the overlay leaves on a cross-fade, which is the
 * one transition the setting does not object to.
 */
const REDUCED: LaunchTiming = {
  plateMs: 0,
  strike: { delayMs: 0, durationMs: 0 },
  // No sky and no rain. A bloom is a brightness change and a drop is travel;
  // stillness means the mark and its beat, and nothing else.
  weather: { flashAtMs: 0, flashMs: 0, rainAtMs: 0, rainMs: 0 },
  holdMs: 400,
  fadeMs: 220,
  totalMs: 620,
};

export function strikeTiming(
  language: MotionLanguage,
  reduceMotion: boolean,
): StrikeTiming {
  return reduceMotion ? REDUCED.strike : STRIKE[language];
}

export function launchTiming(
  language: MotionLanguage,
  reduceMotion: boolean,
): LaunchTiming {
  if (reduceMotion) return REDUCED;

  const strike = STRIKE[language];
  const plateMs = PLATE_MS[language];
  const holdMs = HOLD_MS[language];
  const fadeMs = FADE_MS[language];

  // The plate and the bolt overlap on purpose -- the bolt starts falling while
  // the plate is still arriving -- so the hold begins at whichever finishes
  // last rather than at their sum.
  const markMs = Math.max(plateMs, strike.delayMs + strike.durationMs);

  return {
    plateMs,
    strike,
    weather: {
      flashAtMs: strike.delayMs + strike.durationMs,
      // Capped at the hold, so the sky is dark again before the curtain moves
      // rather than fading out with it -- a bloom that leaves on the crossfade
      // reads as the screen dimming, not as lightning.
      flashMs: Math.min(holdMs, FLASH_MS),
      rainAtMs: markMs,
      rainMs: holdMs + fadeMs,
    },
    holdMs,
    fadeMs,
    totalMs: markMs + holdMs + fadeMs,
  };
}
