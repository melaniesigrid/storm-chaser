import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';

import type { LaunchWeatherTiming } from './launchSequence';

/**
 * One drop, as data. Fifteen of these are the whole storm.
 *
 * Hand-placed rather than random, for the same reason the launch timings are
 * hand-placed: a random field cannot be looked at twice, and half of these
 * numbers exist to keep the drops OFF the mark in the middle of the screen.
 * `x` is a fraction of the width, `delayMs` is measured from the first drop.
 */
interface DropSpec {
  x: number;
  size: number;
  delayMs: number;
  opacity: number;
}

const DROPS: readonly DropSpec[] = [
  { x: 0.06, size: 13, delayMs: 0, opacity: 0.5 },
  { x: 0.15, size: 8, delayMs: 120, opacity: 0.32 },
  { x: 0.23, size: 17, delayMs: 40, opacity: 0.55 },
  { x: 0.31, size: 10, delayMs: 190, opacity: 0.38 },
  { x: 0.38, size: 14, delayMs: 90, opacity: 0.46 },
  { x: 0.46, size: 7, delayMs: 230, opacity: 0.28 },
  { x: 0.53, size: 11, delayMs: 20, opacity: 0.42 },
  { x: 0.61, size: 16, delayMs: 150, opacity: 0.52 },
  { x: 0.68, size: 9, delayMs: 70, opacity: 0.34 },
  { x: 0.76, size: 13, delayMs: 210, opacity: 0.48 },
  { x: 0.83, size: 8, delayMs: 110, opacity: 0.3 },
  { x: 0.9, size: 15, delayMs: 30, opacity: 0.5 },
  { x: 0.96, size: 10, delayMs: 170, opacity: 0.36 },
  { x: 0.11, size: 11, delayMs: 260, opacity: 0.4 },
  { x: 0.72, size: 12, delayMs: 280, opacity: 0.44 },
];

/**
 * A raindrop, drawn with border radii rather than with a path.
 *
 * Three round corners and one square one is a teardrop standing on its point;
 * rotating it 45 degrees stands it back up, fat end down, the way a drop
 * actually falls. An SVG path would be the same shape and another view in the
 * tree for every drop, on a screen that exists for under a second.
 */
function Drop({
  spec,
  timing,
  color,
  fallTo,
}: {
  spec: DropSpec;
  timing: LaunchWeatherTiming;
  color: string;
  fallTo: number;
}) {
  const progress = useSharedValue(0);
  const { width } = useWindowDimensions();

  // What is left of the rain once this drop has waited its turn. Staggering by
  // shortening rather than by overrunning is what keeps the last drop inside
  // the overlay's own life.
  const durationMs = Math.max(0, timing.rainMs - spec.delayMs);

  useEffect(() => {
    if (durationMs <= 0) return;

    progress.value = 0;
    progress.value = withDelay(
      timing.rainAtMs + spec.delayMs,
      // Gravity, not a glide. Rain that eases out at the bottom of the screen
      // is snow.
      withTiming(1, { duration: durationMs, easing: Easing.in(Easing.quad) }),
    );

    return () => cancelAnimation(progress);
  }, [progress, timing.rainAtMs, spec.delayMs, durationMs]);

  const style = useAnimatedStyle(() => {
    // In over the first sixth, out over the last quarter, so no drop is ever
    // switched on or off -- both would read as a dropped frame.
    const fadeIn = Math.min(1, progress.value * 6);
    const fadeOut = Math.min(1, (1 - progress.value) * 4);

    return {
      opacity: spec.opacity * Math.min(fadeIn, fadeOut),
      transform: [{ translateY: progress.value * fallTo - spec.size * 2 }, { rotate: '-45deg' }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: width * spec.x,
          width: spec.size,
          height: spec.size,
          backgroundColor: color,
          borderRadius: spec.size / 2,
          // The point. Undone on one corner, then rotated upright.
          borderTopLeftRadius: 0,
        },
        style,
      ]}
    />
  );
}

/**
 * The sky on the launch overlay: one flash, then rain.
 *
 * The mark strikes, the sky answers, and the drops it brought down fall
 * through the beat the overlay was already spending on a held mark. It costs
 * the launch nothing -- `LaunchWeatherTiming` is derived from the hold and the
 * fade, never added to them -- which is the only reason a brand moment is
 * allowed to grow a second act at all.
 *
 * The bloom's ceiling is `theme.motion.safety`, not a number chosen here. Those
 * tokens have been asserted against WCAG 2.3.1 since the theme layer was
 * written and this is the first thing in the app to actually read them: the
 * flash covers `flashAreaFraction` of the screen and peaks at
 * `flashLuminanceDelta`, so it fails the general-flash test on both axes at
 * once, which is the way to fail it.
 */
export function LaunchWeather({ timing }: { timing: LaunchWeatherTiming }) {
  const { theme } = useAppTheme();
  const { height } = useWindowDimensions();

  const flash = useSharedValue(0);

  useEffect(() => {
    if (timing.flashMs <= 0) return;

    flash.value = 0;
    flash.value = withDelay(
      timing.flashAtMs,
      withSequence(
        // No ramp up. Lightning is already at full brightness by the time
        // anyone notices it; all that is visible is the decay. A zero-duration
        // step rather than a starting value, because a starting value would
        // have the sky already lit through the whole approach.
        withTiming(1, { duration: 0 }),
        withTiming(0, { duration: timing.flashMs, easing: Easing.out(Easing.quad) }),
      ),
    );

    return () => cancelAnimation(flash);
  }, [flash, timing.flashAtMs, timing.flashMs]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: theme.motion.safety.flashLuminanceDelta * flash.value,
  }));

  if (timing.rainMs <= 0 && timing.flashMs <= 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: height * theme.motion.safety.flashAreaFraction,
          },
          flashStyle,
        ]}
      >
        <LinearGradient
          // The sky lights up in the colour of the thing that just struck it.
          colors={[theme.brand.monogramMark, 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {DROPS.map((spec) => (
        <Drop
          key={spec.x}
          spec={spec}
          timing={timing}
          color={theme.colors.textMuted}
          fallTo={height}
        />
      ))}
    </View>
  );
}
