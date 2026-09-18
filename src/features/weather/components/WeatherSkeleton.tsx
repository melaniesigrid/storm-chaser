import { View } from 'react-native';

import { Panel, Skeleton } from '@/core/ui';

/** Mirrors the real layout so nothing shifts when the snapshot arrives. */
export function WeatherSkeleton() {
  return (
    <View>
      <Panel className="mb-3">
        <Skeleton height={12} width={90} rounded />
        <View className="h-4" />
        <Skeleton height={54} width={170} />
        <View className="h-4" />
        <Skeleton height={14} width="60%" />
      </Panel>

      <Panel className="mb-3">
        <Skeleton height={12} width={80} rounded />
        <View className="h-4" />
        <Skeleton height={44} />
        <View className="h-3" />
        <Skeleton height={44} />
      </Panel>

      <Panel>
        <Skeleton height={12} width={110} rounded />
        <View className="h-4" />
        <Skeleton height={80} />
      </Panel>
    </View>
  );
}
