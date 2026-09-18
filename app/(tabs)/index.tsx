import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Button, Panel, StatusBanner, Text } from '@/core/ui';
import {
  formatBearing,
  formatCoordinates,
  formatPercent,
  formatPrecipitation,
  formatPressure,
  formatRelativeTime,
  formatSpeed,
  formatTemperature,
} from '@/core/utils/format';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { mockSnapshot } from '@/features/weather/api/weatherClient';
import { ChaseIndexPanel } from '@/features/weather/components/ChaseIndexPanel';
import { ForecastStrip } from '@/features/weather/components/ForecastStrip';
import { MetricGrid, type Metric } from '@/features/weather/components/MetricGrid';
import { OutlookList } from '@/features/weather/components/OutlookList';
import { WeatherSkeleton } from '@/features/weather/components/WeatherSkeleton';
import { WeatherUnavailable } from '@/features/weather/components/WeatherUnavailable';
import { useWeatherSnapshot } from '@/features/weather/hooks/useWeather';
import { useNetworkStatus } from '@/services/net/useNetworkStatus';

const STALE_AFTER_MS = 10 * 60 * 1000;

export default function ConditionsScreen() {
  const router = useRouter();
  const location = useDeviceLocation();
  const network = useNetworkStatus();
  const [useSample, setUseSample] = useState(false);

  const query = useWeatherSnapshot(useSample ? null : location.coordinates);

  const snapshot = useMemo(
    () => (useSample ? mockSnapshot(location.coordinates ?? undefined) : query.data),
    [useSample, location.coordinates, query.data],
  );

  const isInitialLoading =
    !useSample && (location.status === 'requesting' || (query.isLoading && !query.data));

  const isStale =
    !useSample &&
    query.dataUpdatedAt > 0 &&
    Date.now() - query.dataUpdatedAt > STALE_AFTER_MS;

  /**
   * Also the way back out of sample mode: dropping the flag re-enables the live
   * query, which then fetches on its own. Without this the fallback would be a
   * one way door for the rest of the session.
   */
  async function refresh() {
    if (!location.coordinates) await location.refresh();

    if (useSample) {
      setUseSample(false);
      return;
    }

    await query.refetch();
  }

  const metrics: Metric[] = snapshot
    ? [
        { label: 'Wind', value: formatSpeed(snapshot.current.windSpeedKmh) },
        {
          label: 'Gusts',
          value: formatSpeed(snapshot.current.windGustKmh),
          emphasis: snapshot.current.windGustKmh >= 60,
        },
        { label: 'Direction', value: formatBearing(snapshot.current.windDirectionDeg) },
        { label: 'Pressure', value: formatPressure(snapshot.current.pressureHpa) },
        {
          label: 'Precipitation',
          value: formatPrecipitation(snapshot.current.precipitationMm),
        },
        { label: 'Humidity', value: formatPercent(snapshot.current.humidityPct) },
        { label: 'Cloud cover', value: formatPercent(snapshot.current.cloudCoverPct) },
        {
          label: 'CAPE',
          value:
            snapshot.current.convective.capeJkg === null
              ? 'n/a'
              : `${Math.round(snapshot.current.convective.capeJkg)}`,
          emphasis: (snapshot.current.convective.capeJkg ?? 0) >= 1500,
        },
      ]
    : [];

  return (
    <ScrollView
      className="flex-1 bg-bone-50 dark:bg-ink-800"
      contentContainerClassName="p-4 pb-12"
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={refresh} tintColor="#F5C242" />
      }
    >
      {!network.isInternetReachable ? (
        <StatusBanner tone="offline" message="Offline. Showing the last saved reading." />
      ) : null}

      {isStale ? (
        <StatusBanner
          tone="stale"
          message={`Reading is ${formatRelativeTime(new Date(query.dataUpdatedAt).toISOString())}. Pull to refresh.`}
        />
      ) : null}

      {useSample ? (
        <StatusBanner
          tone="alert"
          message="Sample data. Not a live observation. Pull to refresh for live conditions."
        />
      ) : null}

      {isInitialLoading ? <WeatherSkeleton /> : null}

      {!isInitialLoading && !snapshot ? (
        <WeatherUnavailable
          title={location.status === 'denied' ? 'Location is off' : 'No weather data found'}
          reason={
            location.error?.message ??
            (query.error instanceof Error
              ? query.error.message
              : 'The weather service did not return conditions for this position.')
          }
          onRetry={() => void refresh()}
          onUseSample={() => setUseSample(true)}
        />
      ) : null}

      {snapshot ? (
        <>
          <Panel className="mb-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text variant="label" className="mb-2">
                  {location.coordinates
                    ? formatCoordinates(
                        location.coordinates.latitude,
                        location.coordinates.longitude,
                        3,
                      )
                    : 'Position unknown'}
                </Text>
                <Text className="font-bold text-[56px] leading-[58px] text-ink-800 dark:text-bone-50">
                  {formatTemperature(snapshot.current.temperatureC)}
                </Text>
                <Text variant="body" className="mt-1">
                  {snapshot.current.condition.label}
                </Text>
                <Text variant="caption" className="mt-0.5">
                  {`Feels like ${formatTemperature(snapshot.current.apparentTemperatureC)} · updated ${formatRelativeTime(snapshot.fetchedAt)}`}
                </Text>
              </View>
              <Text className="text-[44px] leading-[48px] text-lightning">
                {snapshot.current.condition.glyph}
              </Text>
            </View>
          </Panel>

          <ChaseIndexPanel chase={snapshot.current.chase} />

          <Panel label="Instruments" className="mb-3">
            <MetricGrid metrics={metrics} />
          </Panel>

          <ForecastStrip hours={snapshot.hourly} />
          <OutlookList days={snapshot.daily} />

          <Button
            title="Document this storm"
            onPress={() => router.push('/capture')}
            className="mt-2"
          />
        </>
      ) : null}
    </ScrollView>
  );
}
