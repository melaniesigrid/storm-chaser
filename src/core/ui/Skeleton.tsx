import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

export interface SkeletonProps {
  height?: number;
  width?: number | string;
  rounded?: boolean;
  className?: string;
}

/**
 * Loading placeholder with a slow breathing pulse. Used instead of a spinner on
 * first load so the layout does not jump when data lands.
 */
export function Skeleton({
  height = 16,
  width = '100%',
  rounded = false,
  className = '',
}: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.35)).current;

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
    <Animated.View style={{ opacity: pulse, width: width as number }}>
      <View
        style={{ height }}
        className={`bg-bone-200 dark:bg-ink-600 ${rounded ? 'rounded-full' : 'rounded-lg'} ${className}`}
      />
    </Animated.View>
  );
}
