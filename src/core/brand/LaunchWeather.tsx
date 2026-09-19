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

import Svg, { Circle, Rect } from 'react-native-svg';

import { useAppTheme } from '@/core/theme/useAppTheme';

import type { LaunchWeatherTiming } from './launchSequence';

/** How far the cloud drifts across its arrival, in points. */
const CLOUD_DRIFT = 22;

/** Overcast, not opaque. It is a ground for the mark, never a shape on it. */
const CLOUD_OPACITY = 0.22;

/**
 * One drop, as data. Ten of these are the whole storm.
 *
 * Hand-placed rather than random, for the same reason the launch timings are
 * hand-placed: a random field cannot be looked at twice, and half of these
 * numbers exist to space the field out. `x` is a fraction of the width,
 * `delayMs` is measured from the first drop. Ten is deliberately too few to
 * be a downpour: on an overlay that lives under a second, a dense field reads
 * as noise over the mark rather than as rain behind it.
 */
interface DropSpec {
  x: number;
  size: number;
  delayMs: number;
  opacity: number;
}

const DROPS: readonly DropSpec[] = [
  { x: 0.06, size: 13, delayMs: 0, opacity: 0.5 },
  { x: 0.19, size: 8, delayMs: 120, opacity: 0.32 },
  { x: 0.28, size: 16, delayMs: 40, opacity: 0.52 },
  { x: 0.4, size: 10, delayMs: 190, opacity: 0.38 },
  { x: 0.52, size: 13, delayMs: 20, opacity: 0.44 },
  { x: 0.63, size: 8, delayMs: 230, opacity: 0.3 },
  { x: 0.71, size: 15, delayMs: 90, opacity: 0.5 },
  { x: 0.84, size: 9, delayMs: 160, opacity: 0.34 },
  { x: 0.93, size: 12, delayMs: 60, opacity: 0.46 },
  { x: 0.34, size: 9, delayMs: 270, opacity: 0.36 },
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
 * The cloud the rain comes out of.
 *
 * Circles and a slab, the same silhouette the landing page masks its cloud
 * with, because they are one mark in two runtimes and a cloud drawn twice by
 * eye is two clouds. It arrives while the bolt is still falling and it is
 * still there when the last drop goes, so the drops are always leaving
 * something rather than starting out of nothing.
 */
function Cloud({ timing, color, width }: { timing: LaunchWeatherTiming; color: string; width: number }) {
  const roll = useSharedValue(0);

  useEffect(() => {
    if (timing.cloudMs <= 0) return;

    roll.value = 0;
    roll.value = withDelay(
      timing.cloudAtMs,
      withTiming(1, { duration: timing.cloudMs, easing: Easing.out(Easing.cubic) }),
    );

    return () => cancelAnimation(roll);
  }, [roll, timing.cloudAtMs, timing.cloudMs]);

  const style = useAnimatedStyle(() => ({
    opacity: CLOUD_OPACITY * roll.value,
    // Drifting in on the wind that brought it, not sliding into a slot.
    transform: [{ translateX: (roll.value - 1) * CLOUD_DRIFT }],
  }));

  const size = Math.min(width * 0.62, 320);

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: '14%', alignSelf: 'center', width: size },
        style,
      ]}
    >
      <Svg width={size} height={(size * 92) / 200} viewBox="0 0 200 92">
        <Circle cx="58" cy="50" r="30" fill={color} />
        <Circle cx="102" cy="36" r="36" fill={color} />
        <Circle cx="148" cy="52" r="27" fill={color} />
        <Rect x="28" y="50" width="146" height="32" rx="16" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The sky on the launch overlay: a cloud, a flash, then rain.
 *
 * The cloud rolls in behind the falling bolt, the mark strikes, the sky
 * answers, and the drops it brought down fall
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
  const { height, width } = useWindowDimensions();

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

  if (timing.rainMs <= 0 && timing.flashMs <= 0 && timing.cloudMs <= 0) return null;

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

      <Cloud timing={timing} color={theme.colors.textMuted} width={width} />

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
