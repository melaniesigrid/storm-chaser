import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Text, Volt } from '@/core/ui';

import { nextFact } from '../model/funFacts';
import type { WeatherConditionGroup } from '../model/types';

/** How long a fact stays up before Volt goes back to lounging. */
const FACT_MS = 9000;

export interface VoltPerchProps {
  /** What the sky is doing, so the first tap answers with a fact about it. */
  group: WeatherConditionGroup;
  size?: number;
}

/**
 * Volt, lying across the top corner of the conditions card.
 *
 * The hero runs down the middle of that card -- place name, icon, reading --
 * which leaves two empty shoulders at the top. He takes the right one, tipped
 * back at an angle like something dropped there rather than placed, and a tap
 * gets you a fact about the weather outside.
 *
 * Absolutely positioned and sized in one number, so the card's own layout is
 * untouched: nothing below him moves when the bubble opens or closes. The
 * bubble is drawn as a sibling rather than a child so his tilt does not tip
 * the text with him -- a rotated speech bubble is charming for about one read.
 *
 * Reduce Motion is honoured the whole way down: no sway, no wobble, no spring.
 * The fact still arrives, it just arrives without the performance.
 */
export function VoltPerch({ group, size = 64 }: VoltPerchProps) {
  const window = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [fact, setFact] = useState<{ id: string; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A slow lean, a couple of degrees either side of where he came to rest.
  const sway = useSharedValue(0);
  // The squash of being poked. Separate from the sway so a tap mid-lean does
  // not fight the loop for the same value.
  const poke = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(sway);
  }, [reduceMotion, sway]);

  // The bubble outlives the press by nine seconds, so the timeout can still be
  // pending when the screen goes away. Clearing it on unmount keeps a setState
  // from landing on a component that is no longer mounted.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const perchStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${-14 + sway.value * 5 + poke.value * 9}deg` },
      { translateY: poke.value * size * 0.06 },
      { scale: 1 - poke.value * 0.06 },
    ],
  }));

  function dismiss() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setFact(null);
  }

  function onPress() {
    void Haptics.selectionAsync();

    if (!reduceMotion) {
      poke.value = withSequence(
        withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 6, stiffness: 180, mass: 0.6 }),
      );
    }

    setFact((current) => nextFact(group, current?.id ?? null));

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFact(null), FACT_MS);
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: -size * 0.28,
        right: -size * 0.06,
        alignItems: 'flex-end',
        // He lies ON the card, not in it: without this he paints under the
        // siblings that come after him in the panel.
        zIndex: 3,
      }}
    >
      {/*
        Tap anywhere else and he stops talking, which is what a bubble that
        hangs over the hero has to do -- nine seconds is a long time to wait
        for your own card back.

        Sized off the window and hung from the perch's own origin, so it
        reaches every edge of the screen from a corner of a card. It is
        transparent and it is not a scroll blocker: a press that turns into a
        drag cancels and the list scrolls underneath it as usual. It is drawn
        first, so Volt and the bubble both sit on top of it and keep their own
        taps.
      */}
      {fact ? (
        <Pressable
          onPress={dismiss}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            top: -window.height,
            left: -window.width,
            width: window.width * 2,
            height: window.height * 2,
          }}
        />
      ) : null}

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Volt, the storm chasing robot"
        accessibilityHint="Tells you a fact about the weather"
        // The shell is 64px of drawing inside a box that clears the 44px
        // touch minimum on its own; the padding is what keeps the tilt from
        // pushing his corners outside it.
        style={{ padding: 6 }}
      >
        <Animated.View style={perchStyle}>
          <Volt size={size} mood={fact ? 'logged' : 'idle'} />
        </Animated.View>
      </Pressable>

      {fact ? <FactBubble key={fact.id} text={fact.text} reduceMotion={reduceMotion} /> : null}

      {/* The one hint that he does anything. It goes away the moment the first
          fact lands and never comes back -- once you have tapped him you know. */}
      {!fact ? (
        <Text
          variant="label"
          // Tucked in under him rather than hung off his right edge: he
          // overhangs the card on purpose, and the hint following him out
          // there ran off the side of the screen.
          style={{ marginTop: 2, marginRight: size * 0.22, opacity: 0.7 }}
        >
          tap me
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The fact itself, spoken.
 *
 * It grows out of its top-right corner, which is the corner Volt is sitting
 * on, so the bubble reads as coming from him rather than as a panel that
 * appeared underneath him. Width is capped rather than flexed: this hangs over
 * the card's hero, and a bubble that spanned it would be a modal.
 */
function FactBubble({ text, reduceMotion }: { text: string; reduceMotion: boolean }) {
  const { theme } = useAppTheme();
  const open = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    open.value = withSpring(1, { damping: 13, stiffness: 190, mass: 0.7 });
    return () => cancelAnimation(open);
  }, [open, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [
      { scale: 0.82 + open.value * 0.18 },
      { translateY: (1 - open.value) * -8 },
    ],
  }));

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      // Read aloud, never touched. It hangs over the hero, and a bubble that
      // swallowed touches would eat the pull-to-refresh drag for nine seconds.
      pointerEvents="none"
      style={[
        {
          marginTop: 4,
          maxWidth: 232,
          // Grows from the corner nearest Volt rather than from its middle.
          transformOrigin: 'top right',
          borderRadius: theme.radius.control,
          borderWidth: Math.max(theme.borderWidth, 1),
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        style,
      ]}
    >
      {/* The tail: a square of the same surface turned 45 degrees and tucked
          under Volt, with two of its sides showing the border and the other
          two hidden behind the bubble. */}
      <View
        style={{
          position: 'absolute',
          top: -6,
          right: 22,
          width: 11,
          height: 11,
          backgroundColor: theme.colors.surface,
          borderLeftWidth: Math.max(theme.borderWidth, 1),
          borderTopWidth: Math.max(theme.borderWidth, 1),
          borderColor: theme.colors.border,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <Text variant="caption" color={theme.colors.text}>
        {text}
      </Text>
    </Animated.View>
  );
}
