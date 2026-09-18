import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { EmptyState, Panel, Text } from '@/core/ui';
import { chaseLevelForTier, describeStormType } from '@/features/storms/model/stormTypes';
import type { StormReport } from '@/features/storms/model/types';
import { useStormReports } from '@/features/storms/hooks/useStormLog';

export default function MapScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { data } = useStormReports();

  const located = useMemo(
    () => (data ?? []).filter((report) => report.coordinates !== null),
    [data],
  );

  const region = useMemo<Region | undefined>(() => boundingRegion(located), [located]);

  if (!located.length) {
    return (
      <View className="flex-1 bg-bone-50 dark:bg-ink-800">
        <EmptyState
          glyph="◎"
          title="Nothing to plot"
          description="Reports captured with a position fix appear here, coloured by severity."
          actionLabel="Document a storm"
          onAction={() => router.push('/capture')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        showsCompass
      >
        {located.map((report) => {
          const type = describeStormType(report.stormType);
          return (
            <Marker
              key={report.id}
              coordinate={report.coordinates as { latitude: number; longitude: number }}
              pinColor={theme.colors.tier[chaseLevelForTier(type.tier)]}
              title={type.label}
              description={report.notes || 'No notes recorded'}
              onCalloutPress={() => router.push(`/storm/${report.id}`)}
            />
          );
        })}
      </MapView>

      <View className="absolute bottom-6 left-4 right-4">
        <Panel>
          <View className="flex-row items-center justify-between">
            <Text variant="label">{`${located.length} plotted`}</Text>
            <View className="flex-row gap-4">
              <Legend color={theme.colors.tier.severe} label="Severe" />
              <Legend color={theme.colors.tier.active} label="Notable" />
              <Legend color={theme.colors.tier.unsettled} label="Other" />
            </View>
          </View>
        </Panel>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ backgroundColor: color }} className="h-2 w-2 rounded-full" />
      <Text variant="label">{label}</Text>
    </View>
  );
}

/** Fits every plotted report on screen with a small margin. */
export function boundingRegion(reports: StormReport[]): Region | undefined {
  const points = reports
    .map((report) => report.coordinates)
    .filter((value): value is { latitude: number; longitude: number } => value !== null);

  if (!points.length) return undefined;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.05, (maxLon - minLon) * 1.6),
  };
}
