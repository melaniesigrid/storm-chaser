import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { seededRandom } from '@/core/utils/random';

/**
 * The night sky behind a dark theme.
 *
 * Only drawn where the theme is dark, because stars on a daylight gradient are
 * not a style choice, they are a mistake. It sits between the background
 * gradient and the content, so every panel and card still reads against its own
 * surface: this is the ground, not a layer over the app.
 *
 * Positions come from a seeded generator rather than `Math.random`, so the sky
 * is the same on every render and every launch. A field that reshuffles on each
 * re-render reads as noise, and on a screen that already has weather moving
 * over it that noise is expensive as well as ugly.
 *
 * The field used to be static, on the argument that a twinkle is a second
 * animated brightness change for no informational gain. The first half of that
 * is true and the conclusion was wrong: a real sky is never still, and sixty
 * four dots frozen at fixed opacities read as a texture rather than as stars.
 * What made the old objection right was uniformity -- a field pulsing in
 * unison is a strobe, and that is the thing worth refusing. So every star gets
 * its OWN rate and its own phase, drawn from the same seed as its position, and
 * the field never lines up.
 */
export interface StarfieldProps {
  /** How many stars to draw. */
  count?: number;
  /** Fraction of the height stars fall within: the sky, not the ground. */
  extent?: number;
}

interface Star {
  /** Percentages, so the field scales to any screen without measurement. */
  top: number;
  left: number;
  size: number;
  opacity: number;
  /**
   * Whole turns of the shared clock this star completes, so its own period is
   * `CLOCK_MS / cycles`. An integer is not an aesthetic choice: the clock
   * jumps from 1 back to 0 on every repeat, and only a whole number of turns
   * lands back where it started. A fractional one snaps, and a field of sixty
   * four dots all snapping on the same frame is the strobe this is avoiding.
   */
  cycles: number;
  /** Where in its own turn the star starts, so nothing begins together. */
  phase: number;
  /** How much of its brightness this star actually gives up at the trough. */
  depth: number;
}

/**
 * One turn of the shared clock, and the slowest period in the sky.
 *
 * Long on purpose. Stars scintillate on the order of seconds, and the fastest
 * star here still takes 2.4s to go dark and back -- far under the 3 flashes a
 * second WCAG 2.3.1 is about, and these are 1-3px dots rather than the large
 * bright area that rule is written for.
 */
const CLOCK_MS = 12000;

/** Turns per clock. Five rates, none a multiple of the field as a whole. */
const RATES = [1, 2, 3, 4, 5] as const;

const TAU = Math.PI * 2;

export function Starfield({ count = 64, extent = 0.62 }: StarfieldProps) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();

  const stars = useMemo(() => buildStars(count, extent), [count, extent]);

  /**
   * One driver for the whole sky.
   *
   * Sixty four `withRepeat` animations would be sixty four timers to keep in
   * step; this is a single linear ramp that every star reads off at its own
   * rate, so the cost of the field is one animation regardless of `count`.
   */
  const clock = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      clock.value = 0;
      return;
    }

    clock.value = withRepeat(
      withTiming(1, { duration: CLOCK_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [clock, reduceMotion]);

  if (!theme.isDark) return null;

  return (
    <View
      pointerEvents="none"
      // Decorative: a screen reader announcing sixty-four stars would be worse
      // than silence, and there is no information here it would be losing.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {stars.map((star, index) => (
        <Twinkle
          key={index}
          star={star}
          clock={clock}
          colour={theme.colors.text}
          still={reduceMotion}
        />
      ))}
    </View>
  );
}

/**
 * One star.
 *
 * A component rather than an inline style because `useAnimatedStyle` is a
 * hook and the field is a map. The whole brightness calculation runs on the UI
 * thread off the shared clock, so a scrolling list never competes with it.
 */
function Twinkle({
  star,
  clock,
  colour,
  still,
}: {
  star: Star;
  clock: SharedValue<number>;
  colour: string;
  still: boolean;
}) {
  const animated = useAnimatedStyle(() => {
    if (still) return { opacity: star.opacity };

    // A sine rather than a triangle: a star fading linearly and reversing at
    // the ends reads as a blinking light. This eases through both turns.
    const wave = 0.5 + 0.5 * Math.sin(TAU * (clock.value * star.cycles + star.phase));

    return { opacity: star.opacity * (1 - star.depth + star.depth * wave) };
  }, [still]);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: `${star.top}%`,
          left: `${star.left}%`,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: colour,
        },
        animated,
      ]}
    />
  );
}

/**
 * A fixed sky.
 *
 * Denser and brighter towards the top: the gradient is darkest there in both
 * night themes, and stars scattered evenly down the screen end up fighting the
 * haze band at the horizon where they would not be visible anyway.
 */
function buildStars(count: number, extent: number): Star[] {
  const random = seededRandom(0x5f3a91);
  const stars: Star[] = [];

  for (let index = 0; index < count; index += 1) {
    // Squaring the roll biases the draw towards zero, which puts more stars up
    // where the sky is darkest without needing a second loop for a top band.
    const depth = random() ** 2;

    // Drawn from the same stream as the position, so a star keeps its rate for
    // as long as it keeps its place in the sky.
    const rate = RATES[Math.floor(random() * RATES.length)] ?? 1;

    stars.push({
      top: depth * extent * 100,
      left: random() * 100,
      size: 1 + Math.round(random() * 2),
      // Fainter towards the horizon, for the same reason.
      opacity: 0.22 + (1 - depth) * 0.45,
      cycles: rate,
      phase: random(),
      // Between a fifth and two thirds of its brightness. Nothing goes out
      // entirely: a star that reaches zero reads as a dead pixel, and a field
      // where dots vanish and reappear is busier than one that breathes.
      depth: 0.2 + random() * 0.45,
    });
  }

  return stars;
}
