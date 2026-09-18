import { useEffect, useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';

const COUNT = 42;
const DURATION = 1800;

export interface ConfettiProps {
  /** Flip to true to fire once. Set back to false before firing again. */
  active: boolean;
  onDone?: () => void;
}

interface Piece {
  key: number;
  startX: number;
  drift: number;
  delay: number;
  size: number;
  rotations: number;
  color: string;
  square: boolean;
}

/**
 * A single celebration burst, fired when a report lands in the log.
 *
 * Hand rolled on Reanimated rather than pulling in a confetti package: the whole
 * effect is 40-odd views on the UI thread, and the existing dependency already
 * does everything needed. Pieces use the active theme's tier colours, so the
 * celebration looks like it belongs to the app rather than to a library.
 *
 * Reduce Motion skips the animation entirely and reports done immediately, so
 * nothing is left mounted and the save flow still completes.
 */
export function Confetti({ active, onDone }: ConfettiProps) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const { width } = Dimensions.get('window');

  const palette = useMemo(
    () => [
      theme.colors.tier.unsettled,
      theme.colors.tier.active,
      theme.colors.tier.severe,
      theme.colors.tier.extreme,
      theme.colors.accent,
    ],
    [theme],
  );

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: COUNT }, (_, index) => ({
        key: index,
        startX: Math.random() * width,
        drift: (Math.random() - 0.5) * 180,
        delay: Math.random() * 320,
        size: 7 + Math.random() * 9,
        rotations: 1 + Math.random() * 2.5,
        color: palette[index % palette.length] as string,
        square: Math.random() > 0.4,
      })),
    [palette, width],
  );

  useEffect(() => {
    if (active && reduceMotion) onDone?.();
  }, [active, reduceMotion, onDone]);

  if (!active || reduceMotion) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {pieces.map((piece, index) => (
        <Piece
          key={piece.key}
          piece={piece}
          // Only the last piece reports completion, so onDone fires once.
          onDone={index === pieces.length - 1 ? onDone : undefined}
        />
      ))}
    </View>
  );
}

function Piece({ piece, onDone }: { piece: Piece; onDone?: () => void }) {
  const progress = useSharedValue(0);
  const { height } = Dimensions.get('window');

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
  }, [piece.delay, progress, onDone]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 + progress.value * (height + 80) },
      { translateX: progress.value * piece.drift },
      { rotate: `${progress.value * piece.rotations * 360}deg` },
    ],
    // Hold full opacity most of the way down, then fade out near the floor.
    opacity: progress.value > 0.75 ? 1 - (progress.value - 0.75) / 0.25 : 1,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.startX,
          top: 0,
          width: piece.size,
          height: piece.square ? piece.size : piece.size * 1.8,
          borderRadius: piece.square ? 2 : piece.size,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}
