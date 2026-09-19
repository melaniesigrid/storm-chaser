import { View } from 'react-native';

import { Monogram } from '@/core/brand';
import { Panel, Skeleton } from '@/core/ui';

/** Mirrors the real layout so nothing shifts when the snapshot arrives. */
export function WeatherSkeleton() {
  return (
    <View>
      <Panel style={{ marginBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Skeleton height={14} width={90} rounded />
          {/*
            The one place the mark is allowed to loop. It is standing in for a
            spinner here -- a forecast is genuinely in flight -- so the motion
            is reporting something rather than decorating a wait.
          */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Monogram size={28} motion="pulse" />
          </View>
        </View>
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
