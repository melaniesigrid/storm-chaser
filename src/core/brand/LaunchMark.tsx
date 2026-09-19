import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { LaunchWeather } from './LaunchWeather';
import { Monogram } from './Monogram';
import { launchTiming } from './launchSequence';

/** How much of the mark's own size it grows through on the way in. */
const ENTER_SCALE = 0.88;

export interface LaunchMarkProps {
  /** Called once the overlay has finished leaving, or has been skipped. */
  onDone: () => void;
  size?: number;
}

/**
 * The opening: the mark, struck once, over the sky the app is about to show.
 *
 * This plays on every launch rather than only the first, which is a deliberate
 * choice and a defensible one only because of `LAUNCH_CEILING_MS` -- the whole
 * thing is over inside a second, and the app is already mounted and fetching
 * underneath it. It is a curtain, not a gate.
 *
 * The ground is the active theme's own gradient, the same four stops `Screen`
 * paints, so the exit fades the mark out of a sky that does not change. Done
 * any other way -- a plate colour, a flat background -- the last frame of the
 * launch and the first frame of the app disagree, and the handoff shows.
 *
 * A tap skips it. Anyone who has seen it four hundred times is right.
 */
export function LaunchMark({ onDone, size = 132 }: LaunchMarkProps) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();

  const timing = launchTiming(theme.motion.language, reduceMotion);

  const enter = useSharedValue(timing.plateMs > 0 ? 0 : 1);
  const leave = useSharedValue(1);

  const finish = useCallback(() => {
    onDone();
  }, [onDone]);

  useEffect(() => {
    enter.value = withTiming(1, {
      duration: timing.plateMs,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

    leave.value = withDelay(
      timing.totalMs - timing.fadeMs,
      withTiming(0, { duration: timing.fadeMs, easing: Easing.out(Easing.quad) }, (done) => {
        // Only on a real completion. An interrupted exit means something else
        // already dismissed the overlay, and calling back twice would fight it.
        if (done) runOnJS(finish)();
      }),
    );

    // Belt and braces. A reanimated callback fires on the UI thread, and an
    // animation interrupted by a backgrounded app can finish with `done` false
    // -- which would leave an opaque overlay sitting on top of the whole app
    // with no way past it. The stuck-curtain failure is severe enough that it
    // gets a second, dumber way out.
    const fallback = setTimeout(finish, timing.totalMs + 400);

    return () => {
      clearTimeout(fallback);
      cancelAnimation(enter);
      cancelAnimation(leave);
    };
  }, [enter, leave, timing.plateMs, timing.totalMs, timing.fadeMs, finish]);

  const skip = useCallback(() => {
    cancelAnimation(enter);
    cancelAnimation(leave);
    finish();
  }, [enter, leave, finish]);

  const groundStyle = useAnimatedStyle(() => ({ opacity: leave.value }));

  const markStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: ENTER_SCALE + (1 - ENTER_SCALE) * enter.value }],
  }));

  return (
    <Animated.View
      // Elevation as well as absolute position: on Android paint order does
      // not follow sibling order without it, and the overlay would launch
      // underneath the app it is covering.
      style={[StyleSheet.absoluteFill, { elevation: 24, zIndex: 24 }, groundStyle]}
      pointerEvents="auto"
    >
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        locations={theme.colors.backgroundGradientLocations}
        style={StyleSheet.absoluteFill}
      />
      {/*
        Above the ground and below the mark. Weather in front of the wordmark
        would be weather ON the wordmark, and the mark is the thing the second
        is being spent on.
      */}
      <LaunchWeather timing={timing.weather} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Storm Chaser"
        accessibilityHint="Skips the opening animation"
        onPress={skip}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View style={markStyle}>
          <Monogram size={size} motion="strike" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
