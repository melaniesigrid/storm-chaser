import { useEffect, useMemo } from 'react';
import { Animated, Easing, View, type DimensionValue } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';

export interface SkeletonProps {
  height?: number;
  width?: DimensionValue;
  rounded?: boolean;
}

/**
 * Loading placeholder with a slow breathing pulse. Used instead of a spinner on
 * first load so the layout does not jump when data lands.
 */
export function Skeleton({ height = 16, width = '100%', rounded = false }: SkeletonProps) {
  const { theme } = useAppTheme();
  // `useRef(new Animated.Value(...)).current` reads a ref during render, which
  // React may do twice and discard. `useMemo` gives the same create-once
  // behaviour without the read.
  const pulse = useMemo(() => new Animated.Value(0.35), []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={{ opacity: pulse, width }}>
      <View
        style={{
          height,
          borderRadius: rounded ? height / 2 : 10,
          backgroundColor: theme.colors.surfaceSunken,
        }}
      />
    </Animated.View>
  );
}
