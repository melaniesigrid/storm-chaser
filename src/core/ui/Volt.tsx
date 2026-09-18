import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';
import type { Theme } from '@/core/theme/themes';

export type VoltMood = 'idle' | 'alert' | 'logged' | 'offline' | 'asleep';

export interface VoltProps {
  size?: number;
  mood?: VoltMood;
}

/**
 * Volt: one square, two eyes.
 *
 * Pure geometry, so he renders from a 24px badge to a 150px onboarding hero
 * with no image assets and no export step. Detail follows the theme rather
 * than a prop: Skyward keeps him to a shell and two eyes, Field Card gives him
 * the visor, antenna, rivets and vents that match its heavier outlines.
 *
 * His shell colour comes from `theme.brand.voltShell`, not from the accent. He
 * is a character with a colour of his own — yellow by day, powered down to
 * slate at night — and moods are what light him up.
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

  const shell = shellColors(mood, theme);
  const eyeTint = detailed ? theme.brand.voltEye : shell.eyeOnBare;

  return (
    <Animated.View style={[{ alignItems: 'center' }, bobStyle]}>
      {detailed ? <Antenna size={size} theme={theme} /> : null}

      <View
        style={[
          {
            width: size,
            height: size * 0.97,
            borderRadius: size * 0.27,
            backgroundColor: shell.base,
            borderWidth: detailed ? 3 : 0,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            gap: size * 0.06,
            overflow: 'hidden',
          },
          lift(theme, size),
        ]}
      >
        {/*
          Idle is the only mood that keeps his own shell, so it is the only one
          that gets the three-stop moulding. A mood colour stays flat: tinting
          a gradient by mood made `alert` read as two different reds.
        */}
        {shell.gradient ? (
          <LinearGradient
            colors={theme.brand.voltShell}
            locations={[0, 0.44, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}

        {/* The chin: an inset bar that gives the shell a lit top and a shaded
            underside without a second colour token. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: size * 0.06,
            backgroundColor: theme.brand.voltShade,
          }}
        />

        {detailed ? <Rivets size={size} color={theme.colors.border} /> : null}

        {detailed ? (
          <Visor size={size} mood={mood} tint={eyeTint} />
        ) : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: size * 0.17,
            }}
          >
            <Eye mood={mood} size={size} tint={eyeTint} />
            <Eye mood={mood} size={size} tint={eyeTint} />
          </View>
        )}

        {detailed ? <Vents size={size} /> : null}
      </View>

      {mood === 'asleep' ? <Sleep size={size} theme={theme} /> : null}
    </Animated.View>
  );
}

/**
 * What the shell is made of in a given mood.
 *
 * `eyeOnBare` exists because Skyward draws pupils straight onto the shell: on
 * a dark night shell, black pupils vanish, so they invert to the light tint
 * the theme already declares for the Field Card visor.
 */
function shellColors(
  mood: VoltMood,
  theme: Theme,
): { base: string; gradient: boolean; eyeOnBare: string } {
  const bare = theme.isDark ? theme.brand.voltEye : '#14140F';

  switch (mood) {
    case 'alert':
      return { base: theme.colors.tier.severe, gradient: false, eyeOnBare: '#14140F' };
    case 'logged':
      return { base: theme.colors.tier.unsettled, gradient: false, eyeOnBare: '#14140F' };
    case 'offline':
    case 'asleep':
      return { base: theme.colors.tier.dormant, gradient: false, eyeOnBare: '#C2C9D4' };
    case 'idle':
      return { base: theme.brand.voltShell[1], gradient: true, eyeOnBare: bare };
  }
}

/** Volt lifts off the page the same way every other raised thing in the theme does. */
function lift(theme: Theme, size: number) {
  if (theme.elevation === 'hard') {
    return {
      shadowColor: theme.brand.voltGlow,
      shadowOpacity: 1,
      shadowOffset: { width: 4, height: 4 },
      shadowRadius: 0,
      elevation: 0,
    };
  }

  if (theme.elevation === 'glow') {
    return {
      shadowColor: theme.brand.voltGlow,
      shadowOpacity: 0.9,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: size * 0.23,
      elevation: 0,
    };
  }

  return {
    shadowColor: theme.brand.voltGlow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: size * 0.09 },
    shadowRadius: size * 0.19,
    elevation: 4,
  };
}

/** Field Card only: a stalk and a bulb that breathes. */
function Antenna({ size, theme }: { size: number; theme: Theme }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.65,
    transform: [{ scale: 0.85 + pulse.value * 0.3 }],
  }));

  return (
    <>
      <View
        style={{
          width: size * 0.04,
          height: size * 0.14,
          borderRadius: size * 0.02,
          backgroundColor: theme.brand.voltShell[2],
        }}
      />
      <Animated.View
        style={[
          {
            width: size * 0.11,
            height: size * 0.11,
            marginTop: -size * 0.03,
            marginBottom: -size * 0.04,
            borderRadius: size * 0.06,
            backgroundColor: theme.colors.tier.severe,
            shadowColor: theme.colors.tier.severe,
            shadowOpacity: 0.6,
            shadowRadius: size * 0.09,
            shadowOffset: { width: 0, height: 0 },
            zIndex: 2,
          },
          style,
        ]}
      />
    </>
  );
}

/** Field Card only: the eyes behind smoked glass, with a highlight sweeping across it. */
function Visor({ size, mood, tint }: { size: number; mood: VoltMood; tint: string }) {
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    sweep.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2750, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2250 }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, sweep]);

  const width = size * 0.72;

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width * 0.4 + sweep.value * width * 1.4 }],
  }));

  return (
    <View
      style={{
        width,
        height: size * 0.4,
        borderRadius: size * 0.17,
        backgroundColor: '#14140F',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: size * 0.16,
        overflow: 'hidden',
      }}
    >
      <Eye mood={mood} size={size} tint={tint} catchlight />
      <Eye mood={mood} size={size} tint={tint} catchlight />

      <Animated.View
        style={[
          { position: 'absolute', top: 0, bottom: 0, width: size * 0.23 },
          sweepStyle,
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

function Eye({
  mood,
  size,
  tint,
  catchlight = false,
}: {
  mood: VoltMood;
  size: number;
  tint: string;
  catchlight?: boolean;
}) {
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
    >
      {/* A single catchlight, and only behind the visor. On Skyward the pupil
          is drawn straight onto the shell, where a white dot reads as a
          blemish rather than as a highlight. */}
      {catchlight ? (
        <View
          style={{
            position: 'absolute',
            left: size * 0.032,
            top: size * 0.032,
            width: size * 0.055,
            height: size * 0.055,
            borderRadius: size * 0.03,
            backgroundColor: '#FFFFFF',
          }}
        />
      ) : null}
    </Animated.View>
  );
}

/** Two z's drifting up and away. The only thing that says asleep rather than off. */
function Sleep({ size, theme }: { size: number; theme: Theme }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', right: -size * 0.04, top: -size * 0.06 }}
    >
      <Zed size={size} theme={theme} scale={1} delay={0} />
      <Zed size={size} theme={theme} scale={0.72} delay={1000} />
    </View>
  );
}

function Zed({
  size,
  theme,
  scale,
  delay,
}: {
  size: number;
  theme: Theme;
  scale: number;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 3000, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [delay, drift, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.7 : Math.sin(drift.value * Math.PI) * 0.9,
    transform: [
      { translateX: drift.value * size * 0.13 },
      { translateY: -drift.value * size * 0.22 },
      { scale: 0.6 + drift.value * 0.55 },
    ],
  }));

  return (
    <Animated.Text
      style={[
        {
          fontFamily: theme.type.display,
          fontSize: size * 0.15 * scale,
          lineHeight: size * 0.17 * scale,
          color: theme.colors.textMuted,
        },
        style,
      ]}
    >
      z
    </Animated.Text>
  );
}

function Vents({ size }: { size: number }) {
  return (
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
