import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { EmptyState, Panel, Text } from '@/core/ui';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { useCommunityReports } from '@/features/storms/hooks/useCommunityReports';
import { useStormReports } from '@/features/storms/hooks/useStormLog';
import { isDemoSet } from '@/features/storms/model/community';
import { chaseLevelForTier, describeStormType } from '@/features/storms/model/stormTypes';
import type { StormReport } from '@/features/storms/model/types';
import { toLevel } from '@/features/weather/model/severity';

export default function MapScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const location = useDeviceLocation();
  const { data } = useStormReports();
  const { data: community } = useCommunityReports(location.coordinates);

  const located = useMemo(
    () => (data ?? []).filter((report) => report.coordinates !== null),
    [data],
  );

  const others = community ?? [];
  const demo = isDemoSet(others);

  const region = useMemo<Region | undefined>(() => boundingRegion(located), [located]);

  // Only fully empty when there is nothing of anyone's to plot.
  if (!located.length && !others.length) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <EmptyState
          illustration={<WeatherIcon name="compass" size={96} />}
          title="Nothing to plot"
          description="Reports captured with a position fix appear here, coloured by severity."
          actionLabel="Document a storm"
          onAction={() => router.push('/capture')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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

        {/*
          Community pins are drawn as hollow rings rather than solid pins, so
          someone else's storm can never be mistaken for one of your own at a
          glance. They carry no onCalloutPress: there is no local report to open.
        */}
        {others.map((report) => (
          <Marker
            key={report.id}
            coordinate={report.coordinates}
            title={`${describeStormType(report.stormType).label} · ${report.chaser}`}
            description={report.notes}
            tracksViewChanges={false}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 4,
                borderColor: theme.colors.tier[toLevel(report.chaseScore)],
                backgroundColor: theme.colors.surface,
              }}
            />
          </Marker>
        ))}
      </MapView>

      <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
        <Panel>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text variant="label">{`${located.length} yours`}</Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Legend color={theme.colors.tier.severe} label="Severe" />
              <Legend color={theme.colors.tier.active} label="Notable" />
              <Legend color={theme.colors.tier.unsettled} label="Other" />
            </View>
          </View>

          {others.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  borderWidth: 3,
                  borderColor: theme.colors.textMuted,
                  backgroundColor: theme.colors.surface,
                }}
              />
              <Text variant="label" style={{ flex: 1 }}>
                {demo
                  ? `${others.length} community · demo data`
                  : `${others.length} from other chasers`}
              </Text>
            </View>
          ) : null}
        </Panel>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ backgroundColor: color, height: 10, width: 10, borderRadius: 5 }} />
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
