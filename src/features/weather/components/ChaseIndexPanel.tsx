import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';

import type { ChaseIndex } from '../model/types';

const SEGMENTS = 20;

/**
 * The Chase Index: the one number this app knows that a generic weather app
 * does not. It gets the largest readout on the screen and the tier colour.
 *
 * The meter fills left to right on mount, one segment at a time. Reduce Motion
 * is honoured by snapping every segment straight to its final state, so the
 * information is identical and only the theatre is dropped.
 */
export function ChaseIndexPanel({ chase }: { chase: ChaseIndex }) {
  const { theme } = useAppTheme();
  const tint = theme.colors.tier[chase.level];

  return (
    <Panel label="Chase index" style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <Text variant="score" color={theme.colors.tierText[chase.level]}>
          {String(chase.score)}
        </Text>
        <Text variant="body" style={{ flex: 1, paddingBottom: 8 }}>
          {chase.headline}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 3, marginTop: 14 }}>
        {Array.from({ length: SEGMENTS }).map((_, index) => (
          <Segment
            key={index}
            index={index}
            filled={chase.score >= (index + 1) * (100 / SEGMENTS)}
            tint={tint}
            track={theme.colors.surfaceSunken}
          />
        ))}
      </View>

      {chase.drivers.length > 0 ? (
        <View style={{ marginTop: 16, gap: 6 }}>
          {chase.drivers.slice(0, 3).map((driver) => (
            <View key={driver} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tint }}
              />
              <Text variant="caption" style={{ flex: 1 }}>
                {driver}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="caption" style={{ marginTop: 16 }}>
          No convective signal in the current observation.
        </Text>
      )}
    </Panel>
  );
}

function Segment({
  index,
  filled,
  tint,
  track,
}: {
  index: number;
  filled: boolean;
  tint: string;
  track: string;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(filled && reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!filled) {
      progress.value = withTiming(0, { duration: 160 });
      return;
    }

    if (reduceMotion) {
      progress.value = 1;
      return;
    }

    progress.value = withDelay(
      index * 26,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
    );
  }, [filled, index, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + progress.value * 0.75,
    transform: [{ scaleY: 0.55 + progress.value * 0.45 }],
    backgroundColor: progress.value > 0 ? tint : track,
  }));

  return (
    <Animated.View
      style={[
        { height: 12, flex: 1, borderRadius: 3, backgroundColor: track },
        filled ? style : null,
      ]}
    />
  );
}
