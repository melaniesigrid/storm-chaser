import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Screen, StatusBanner, Text } from '@/core/ui';
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
import { usePublishLastKnownPosition } from '@/features/location/lastKnownPosition';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { usePlaceName } from '@/features/location/usePlaceName';
import { StormLoreCard } from '@/features/storms/components/StormLoreCard';
import { mockSnapshot } from '@/features/weather/api/weatherClient';
import { ChaseIndexPanel } from '@/features/weather/components/ChaseIndexPanel';
import { ForecastStrip } from '@/features/weather/components/ForecastStrip';
import { MetricGrid, type Metric } from '@/features/weather/components/MetricGrid';
import { OutlookList } from '@/features/weather/components/OutlookList';
import { WeatherSkeleton } from '@/features/weather/components/WeatherSkeleton';
import { WeatherUnavailable } from '@/features/weather/components/WeatherUnavailable';
import { useWeatherSnapshot } from '@/features/weather/hooks/useWeather';
import { iconForCondition } from '@/features/weather/model/weatherIcons';
import { useNetworkStatus } from '@/services/net/useNetworkStatus';

const STALE_AFTER_MS = 10 * 60 * 1000;

export default function ConditionsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const location = useDeviceLocation();
  // Conditions is the root tab and holds the lore card that opens the legend
  // screen, so it publishes too. Without this, tapping through from the card
  // showed "Position unknown" on the same data the card had just measured.
  usePublishLastKnownPosition(location.coordinates);
  // Decoration over a number the screen already has: null until the lookup
  // lands, and null forever if it cannot, in which case the readout below
  // stands on its own exactly as it used to.
  const place = usePlaceName(location.coordinates);
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
        { label: 'Wind', value: formatSpeed(snapshot.current.windSpeedKmh), icon: 'windsock' },
        {
          label: 'Gusts',
          value: formatSpeed(snapshot.current.windGustKmh),
          emphasis: snapshot.current.windGustKmh >= 60,
          icon: 'windsock',
        },
        {
          label: 'Direction',
          value: formatBearing(snapshot.current.windDirectionDeg),
          icon: 'compass',
        },
        {
          label: 'Pressure',
          value: formatPressure(snapshot.current.pressureHpa),
          icon: 'barometer',
        },
        {
          label: 'Precipitation',
          value: formatPrecipitation(snapshot.current.precipitationMm),
          icon: 'raindrops',
        },
        {
          label: 'Humidity',
          value: formatPercent(snapshot.current.humidityPct),
          icon: 'raindrops',
        },
        {
          label: 'Cloud cover',
          value: formatPercent(snapshot.current.cloudCoverPct),
          icon: 'partly-cloudy-day',
        },
        {
          label: 'CAPE',
          value:
            snapshot.current.convective.capeJkg === null
              ? 'n/a'
              : `${Math.round(snapshot.current.convective.capeJkg)}`,
          emphasis: (snapshot.current.convective.capeJkg ?? 0) >= 1500,
          icon: 'thermometer-celsius',
        },
      ]
    : [];

  return (
    <Screen edgeToEdge>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={refresh}
            tintColor={theme.colors.accent}
          />
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
            <Panel style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  {place ? <Text variant="title">{place}</Text> : null}

                  <Text variant="label" style={{ marginTop: place ? 4 : 0, marginBottom: 10 }}>
                    {location.coordinates
                      ? formatCoordinates(
                          location.coordinates.latitude,
                          location.coordinates.longitude,
                          3,
                        )
                      : 'Position unknown'}
                  </Text>

                  <Text variant="hero">{formatTemperature(snapshot.current.temperatureC)}</Text>

                  <Text variant="title" style={{ marginTop: 6 }}>
                    {snapshot.current.condition.label}
                  </Text>
                  <Text variant="caption" style={{ marginTop: 6 }}>
                    {`Feels like ${formatTemperature(snapshot.current.apparentTemperatureC)} · updated ${formatRelativeTime(snapshot.fetchedAt)}`}
                  </Text>
                </View>

                <WeatherIcon
                  name={iconForCondition(snapshot.current.condition, !snapshot.current.isDay)}
                  size={124}
                />
              </View>
            </Panel>

            <ChaseIndexPanel chase={snapshot.current.chase} />

            <Panel label="Instruments" style={{ marginBottom: 12 }}>
              <MetricGrid metrics={metrics} />
            </Panel>

            <ForecastStrip hours={snapshot.hourly} />
            <OutlookList days={snapshot.daily} />

            <StormLoreCard origin={location.coordinates} />

            <Button
              title="Document a storm"
              icon={<WeatherIcon name="lightning-bolt" size={30} />}
              onPress={() => router.push('/capture')}
              style={{ marginTop: 8 }}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
