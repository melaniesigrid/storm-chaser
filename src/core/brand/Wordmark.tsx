import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Text } from '@/core/ui/Text';

export interface WordmarkProps {
  /** Cap size of one line. The whole lockup is derived from it. */
  size?: number;
  /** The ray draws itself in on mount. Off for static places like a header. */
  animated?: boolean;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}

/**
 * The wordmark: two words, two weights, one ray.
 *
 * The idea is weight contrast inside a single word — hairline `storm` sitting
 * on extrabold `chaser` — so the lockup needs no icon to be recognisable and
 * survives being set at 20px in a header. The ray under it is the same
 * three-stop gradient the exported icon SVGs use, and it draws left to right once when
 * the lockup appears.
 *
 * Field Card cannot do weight contrast: Archivo Black ships one weight. There
 * the same idea is carried by case and by a hard square ray instead of a
 * rounded one, which is consistent with how that theme treats every other
 * border in the app.
 */
export function Wordmark({
  size = 56,
  animated = true,
  align = 'center',
  style,
}: WordmarkProps) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const stacked = theme.borderWidth > 0;

  const draw = useSharedValue(animated && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!animated || reduceMotion) {
      draw.value = 1;
      return;
    }

    draw.value = withDelay(
      160,
      withTiming(1, { duration: 720, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );
  }, [animated, draw, reduceMotion]);

  // `scaleX` in React Native pivots on the centre and there is no
  // transform-origin, so the ray's own width is needed to shift the pivot back
  // to its left edge. Measuring once on layout is cheaper than animating
  // `width`, which would re-run layout every frame.
  const rayWidth = useSharedValue(0);

  const rayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (-rayWidth.value * (1 - draw.value)) / 2 },
      { scaleX: draw.value },
    ],
  }));

  const rayHeight = Math.max(4, Math.round(size * 0.125));
  const lineHeight = Math.round(size * 0.94);

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Storm Chaser"
      style={[{ alignSelf: align === 'center' ? 'center' : 'flex-start' }, style]}
    >
      <Text
        variant="display"
        style={{
          fontFamily: theme.type.displayLight,
          fontSize: size,
          lineHeight,
          letterSpacing: -size * 0.036 * theme.type.displayTracking,
          textAlign: align,
        }}
      >
        {stacked ? 'STORM' : 'storm'}
      </Text>
      <Text
        variant="display"
        style={{
          fontSize: size,
          lineHeight,
          letterSpacing: -size * 0.036 * theme.type.displayTracking,
          textAlign: align,
        }}
      >
        {stacked ? 'CHASER' : 'chaser'}
      </Text>

      <Animated.View
        onLayout={(event) => {
          rayWidth.value = event.nativeEvent.layout.width;
        }}
        style={[
          {
            height: rayHeight,
            marginTop: Math.round(size * 0.13),
            borderRadius: stacked ? 0 : rayHeight / 2,
            overflow: 'hidden',
          },
          rayStyle,
        ]}
      >
        <LinearGradient
          colors={theme.brand.ray}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
