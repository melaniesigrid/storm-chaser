import { View } from 'react-native';

import { Panel, Skeleton } from '@/core/ui';

/** Mirrors the real layout so nothing shifts when the snapshot arrives. */
export function WeatherSkeleton() {
  return (
    <View>
      <Panel style={{ marginBottom: 12 }}>
        <Skeleton height={14} width={90} rounded />
        <View style={{ height: 16 }} />
        <Skeleton height={64} width={190} />
        <View style={{ height: 16 }} />
        <Skeleton height={16} width="60%" />
      </Panel>

      <Panel style={{ marginBottom: 12 }}>
        <Skeleton height={14} width={80} rounded />
        <View style={{ height: 16 }} />
        <Skeleton height={48} />
        <View style={{ height: 12 }} />
        <Skeleton height={48} />
      </Panel>

      <Panel>
        <Skeleton height={14} width={110} rounded />
        <View style={{ height: 16 }} />
        <Skeleton height={88} />
      </Panel>
    </View>
  );
}
