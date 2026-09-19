import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { cheerPurple } from './cheerColors';
import { bleedFor, Text } from './Text';

/**
 * "Stormy!" -- the cheer that lands when a report is filed.
 *
 * It fires alongside the confetti rather than instead of it: the confetti says
 * something happened, the word says what. A burst of colour on its own is
 * ambiguous the first time you see it.
 *
 * The purple is the one colour in the app that means nothing else. Every other
 * hue is already spoken for and load-bearing -- the tier ladder owns amber
 * through red, the accent owns the primary action, and borrowing any of them
 * for a celebration would make a success read as a severity. Purple is unused,
 * so it can only mean this.
 */

const IN_MS = 260;
const HOLD_MS = 900;
const OUT_MS = 340;

export interface StormyCheerProps {
  /** Flip to true to fire once. Set back to false before firing again. */
  active: boolean;
  onDone?: () => void;
  /** Overrides the word, for a different thing worth celebrating. */
  message?: string;
}

export function StormyCheer({ active, onDone, message = 'Stormy!' }: StormyCheerProps) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();

  const progress = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const tilt = useSharedValue(-8);

  useEffect(() => {
    if (!active) return;

    const finish = () => onDone?.();

    if (reduceMotion) {
      // No overshoot and no tilt, but the word still appears and still
      // leaves: Reduce Motion asks for less movement, not less information.
      scale.value = 1;
      tilt.value = 0;
      progress.value = withSequence(
        withTiming(1, { duration: 1 }),
        withDelay(HOLD_MS + IN_MS, withTiming(0, { duration: OUT_MS }, (done) => {
          if (done) runOnJS(finish)();
        })),
      );
      return () => {
        cancelAnimation(progress);
      };
    }

    // Overshoot and settle. The word arrives a little too big and a little
    // crooked, then straightens -- which is what makes it read as cheerful
    // rather than as a notification.
    scale.value = withSequence(
      withTiming(1.18, { duration: IN_MS, easing: Easing.out(Easing.back(2.2)) }),
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
    );
    tilt.value = withSequence(
      withTiming(4, { duration: IN_MS, easing: Easing.out(Easing.quad) }),
      withTiming(-2, { duration: 200, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) }),
    );
    progress.value = withSequence(
      withTiming(1, { duration: IN_MS, easing: Easing.out(Easing.quad) }),
      withDelay(
        HOLD_MS,
        withTiming(0, { duration: OUT_MS, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) runOnJS(finish)();
        }),
      ),
    );

    return () => {
      cancelAnimation(progress);
      cancelAnimation(scale);
      cancelAnimation(tilt);
    };
  }, [active, onDone, progress, reduceMotion, scale, tilt]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: scale.value },
      { rotateZ: `${tilt.value}deg` },
      // Rises slightly as it goes, so the exit reads as leaving rather than
      // as the app dropping a frame.
      { translateY: (1 - progress.value) * 14 },
    ],
  }));

  if (!active) return null;

  const purple = cheerPurple(theme.isDark);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={style}>
        <Text
          accessibilityRole="text"
          // Announced, because a chaser using VoiceOver gets nothing from a
          // word that appears and leaves inside 1.5 seconds.
          accessibilityLiveRegion="polite"
          color={purple}
          style={[
            {
              fontFamily: theme.type.display,
              fontSize: 64,
              lineHeight: 72,
              letterSpacing: -1.5 * theme.type.displayTracking,
              textAlign: 'center',
              // A soft halo rather than a hard drop shadow: the word lands on
              // a photograph-backed list as often as on a flat surface, and it
              // has to stay legible over both without looking stamped on.
              textShadowColor: theme.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 12,
            },
            bleedFor('display', 64),
          ]}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
