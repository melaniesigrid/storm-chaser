import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';

export type VoltMood = 'idle' | 'alert' | 'logged' | 'offline' | 'asleep';

export interface VoltProps {
  size?: number;
  mood?: VoltMood;
}

/**
 * Volt: one square, two eyes.
 *
 * Pure geometry, so he renders from a 24px badge to a 150px onboarding hero
 * with no image assets and no export step. Detail follows the theme rather than
 * a prop: Skyward keeps him to a square and two eyes, Field Card gives him the
 * visor, antenna and rivets that match its heavier outlines.
 */
export function Volt({ size = 128, mood = 'idle' }: VoltProps) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const detailed = theme.elevation === 'hard';

  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [bob, reduceMotion]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * (size * 0.06) }],
  }));

  const body = bodyColor(mood, theme.colors.accent, theme.colors);
  const eyeTint = detailed ? '#FFF8E6' : '#14140F';

  return (
    <Animated.View style={[{ alignItems: 'center' }, bobStyle]}>
      {detailed ? (
        <>
          <View
            style={{
              width: size * 0.04,
              height: size * 0.14,
              borderRadius: size * 0.02,
              backgroundColor: theme.colors.border,
            }}
          />
          <View
            style={{
              width: size * 0.11,
              height: size * 0.11,
              marginTop: -size * 0.03,
              marginBottom: -size * 0.04,
              borderRadius: size * 0.06,
              backgroundColor: theme.colors.tier.severe,
              zIndex: 2,
            }}
          />
        </>
      ) : null}

      <View
        style={{
          width: size,
          height: size * 0.97,
          borderRadius: size * 0.27,
          backgroundColor: body,
          borderWidth: detailed ? 3 : 0,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: size * 0.06,
          overflow: 'hidden',
        }}
      >
        {detailed ? <Rivets size={size} color={theme.colors.border} /> : null}

        <View
          style={
            detailed
              ? {
                  width: size * 0.72,
                  height: size * 0.4,
                  borderRadius: size * 0.17,
                  backgroundColor: '#14140F',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: size * 0.16,
                }
              : {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: size * 0.17,
                }
          }
        >
          <Eye mood={mood} size={size} tint={eyeTint} />
          <Eye mood={mood} size={size} tint={eyeTint} />
        </View>

        {detailed ? (
          <View style={{ flexDirection: 'row', gap: size * 0.04 }}>
            {[0, 1, 2].map((key) => (
              <View
                key={key}
                style={{
                  width: size * 0.17,
                  height: size * 0.03,
                  borderRadius: size * 0.02,
                  backgroundColor: 'rgba(0,0,0,0.28)',
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function bodyColor(
  mood: VoltMood,
  accent: string,
  colors: { tier: Record<string, string> },
): string {
  switch (mood) {
    case 'alert':
      return colors.tier.severe as string;
    case 'logged':
      return colors.tier.unsettled as string;
    case 'offline':
    case 'asleep':
      return colors.tier.dormant as string;
    case 'idle':
      return accent;
  }
}

function Eye({ mood, size, tint }: { mood: VoltMood; size: number; tint: string }) {
  const reduceMotion = useReducedMotion();
  const blink = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || mood === 'asleep' || mood === 'offline') return;
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3400 }),
        withTiming(0.06, { duration: 70 }),
        withTiming(1, { duration: 70 }),
      ),
      -1,
      false,
    );
  }, [blink, mood, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  if (mood === 'asleep' || mood === 'offline') {
    return (
      <View
        style={{
          width: size * 0.2,
          height: size * 0.045,
          borderRadius: size * 0.03,
          backgroundColor: tint,
        }}
      />
    );
  }

  if (mood === 'logged') {
    return (
      <View
        style={{
          width: size * 0.15,
          height: size * 0.08,
          borderTopWidth: size * 0.038,
          borderLeftWidth: size * 0.038,
          borderRightWidth: size * 0.038,
          borderColor: tint,
          borderTopLeftRadius: size * 0.15,
          borderTopRightRadius: size * 0.15,
        }}
      />
    );
  }

  if (mood === 'alert') {
    return (
      <View
        style={{
          width: size * 0.17,
          height: size * 0.17,
          borderRadius: size * 0.09,
          backgroundColor: tint,
        }}
      />
    );
  }

  return (
    <Animated.View
      style={[
        {
          width: size * 0.17,
          height: size * 0.22,
          borderRadius: size * 0.09,
          backgroundColor: tint,
        },
        style,
      ]}
    />
  );
}

function Rivets({ size, color }: { size: number; color: string }) {
  const dot = {
    position: 'absolute' as const,
    width: size * 0.06,
    height: size * 0.06,
    borderRadius: size * 0.03,
    backgroundColor: color,
    opacity: 0.35,
  };
  const inset = size * 0.07;

  return (
    <>
      <View style={[dot, { left: inset, top: inset }]} />
      <View style={[dot, { right: inset, top: inset }]} />
      <View style={[dot, { left: inset, bottom: inset }]} />
      <View style={[dot, { right: inset, bottom: inset }]} />
    </>
  );
}
