import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { useNow } from '@/core/utils/useNow';
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
import { VoltPerch } from '@/features/weather/components/VoltPerch';
import { WeatherSkeleton } from '@/features/weather/components/WeatherSkeleton';
import { WeatherUnavailable } from '@/features/weather/components/WeatherUnavailable';
import { useWeatherSnapshot } from '@/features/weather/hooks/useWeather';
import { iconForCondition } from '@/features/weather/model/weatherIcons';
import { useNetworkStatus } from '@/services/net/useNetworkStatus';

const STALE_AFTER_MS = 10 * 60 * 1000;

/**
 * How often the staleness check re-evaluates. Well under `STALE_AFTER_MS`, and
 * far coarser than a frame: this drives one banner, not an animation.
 */
const STALE_TICK_MS = 15_000;

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

  /**
   * Ticking rather than read during render, so a screen left open actually goes
   * stale on its own instead of waiting for an unrelated re-render to notice.
   */
  const now = useNow(STALE_TICK_MS);

  const isStale =
    !useSample && query.dataUpdatedAt > 0 && now - query.dataUpdatedAt > STALE_AFTER_MS;

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
            {/*
              The hero runs down the card rather than across it. Side by side,
              the icon and the temperature were two columns fighting for the
              same width, and the icon had to stay small to let the reading
              fit. Stacked, the condition gets to be 150px of weather with the
              place name over it and the reading under it, which is the shape
              the marketing page uses and the reason it looks like a poster
              rather than a table.
            */}
            <Panel style={{ marginBottom: 12, alignItems: 'center' }}>
              {place ? (
                <Text variant="title" style={{ textAlign: 'center' }}>
                  {place}
                </Text>
              ) : null}

              <Text variant="label" style={{ marginTop: place ? 4 : 0 }}>
                {location.coordinates
                  ? formatCoordinates(
                      location.coordinates.latitude,
                      location.coordinates.longitude,
                      3,
                    )
                  : 'Position unknown'}
              </Text>

              <WeatherIcon
                name={iconForCondition(snapshot.current.condition, !snapshot.current.isDay)}
                size={150}
              />

              <Text variant="hero">{formatTemperature(snapshot.current.temperatureC)}</Text>

              <Text variant="title" style={{ marginTop: 8, textAlign: 'center' }}>
                {snapshot.current.condition.label}
              </Text>
              <Text variant="caption" style={{ marginTop: 6, textAlign: 'center' }}>
                {`Feels like ${formatTemperature(snapshot.current.apparentTemperatureC)} · updated ${formatRelativeTime(snapshot.fetchedAt)}`}
              </Text>

              {/*
                Last child, and absolutely positioned: he lands on the empty
                right shoulder the centred hero leaves behind, and paints over
                everything above him rather than under it. Nothing in the card
                moves to make room for him, before or after he speaks.
              */}
              <VoltPerch group={snapshot.current.condition.group} />
            </Panel>

            <ChaseIndexPanel chase={snapshot.current.chase} />

            <Panel label="Instruments" icon="barometer" style={{ marginBottom: 12 }}>
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
