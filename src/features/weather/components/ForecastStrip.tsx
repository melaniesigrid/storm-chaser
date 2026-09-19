import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { Sparkline } from '@/core/charts/Sparkline';
import { compact, normalise } from '@/core/charts/geometry';
import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';
import { formatHourLabel, formatPercent, formatTemperature } from '@/core/utils/format';

import { iconForCondition } from '../model/weatherIcons';
import type { HourlyPoint } from '../model/types';

const COLUMN = 56;
const GAP = 14;
// Bar heights appear twice each, once as the track and once as the fill
// multiplier, so they have to move together or the fill over/underruns.
const RAIN_BAR_HEIGHT = 34;
const CAPE_BAR_HEIGHT = 22;
/** Below this the CAPE bar reads `active`; at or above it, `severe`. */
const CAPE_SEVERE_JKG = 1500;
/** Floor for the shared CAPE domain, so a calm day does not scale up to look busy. */
const CAPE_MIN_DOMAIN = 1000;

export function ForecastStrip({ hours }: { hours: HourlyPoint[] }) {
  const { theme } = useAppTheme();

  // Derived once per forecast rather than per parent render: the sparkline
  // rescales the series and rebuilds a Catmull-Rom path from whatever array it
  // is handed, so a fresh array every render is a fresh chart every render.
  // NOT compacted, unlike the CAPE series below: the sparkline spreads points
  // evenly across a width derived from `hours.length`, so dropping one would
  // slide every later point off the hour it describes. A missing hour arrives
  // as null and stays null all the way into `scaleSeries`, which keeps its
  // slot, marks the point undefined and breaks the curve around it.
  const temperatures = useMemo(() => hours.map((hour) => hour.temperatureC), [hours]);

  // CAPE bars share one domain across the strip, so a tall bar means real
  // instability rather than just the tallest value in this particular window.
  const capeMax = useMemo(() => {
    const capes = compact(hours.map((hour) => hour.capeJkg));
    return capes.length ? Math.max(CAPE_MIN_DOMAIN, Math.max(...capes)) : 0;
  }, [hours]);

  if (!hours.length) return null;

  const chartWidth = hours.length * COLUMN + (hours.length - 1) * GAP;

  return (
    <Panel tone="hourly" label="Next 12 hours" icon="thermometer-celsius" style={{ marginBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ paddingRight: 8 }}>
          {/* The shape of the next twelve hours, which a row of figures cannot show. */}
          <View style={{ marginBottom: 6 }}>
            <Sparkline
              values={temperatures}
              width={chartWidth}
              height={52}
              color={theme.colors.tierText.severe}
              gradientId="forecastTemp"
            />
          </View>

          <View style={{ flexDirection: 'row', gap: GAP }}>
            {hours.map((hour, index) => (
              <View key={hour.time} style={{ alignItems: 'center', width: COLUMN }}>
                <Text variant="label">{index === 0 ? 'Now' : formatHourLabel(hour.time)}</Text>

                <View style={{ marginVertical: 6 }}>
                  <WeatherIcon name={iconForCondition(hour.condition, !hour.isDay)} size={46} />
                </View>

                <Text variant="figure">{formatTemperature(hour.temperatureC)}</Text>

                {/* Rain chance as a filled column: scannable without reading it. */}
                <View
                  style={{
                    width: 26,
                    height: RAIN_BAR_HEIGHT,
                    marginTop: 8,
                    borderRadius: 4,
                    backgroundColor: theme.colors.surfaceSunken,
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: Math.max(
                        2,
                        normalise(hour.precipitationProbabilityPct, 0, 100) * RAIN_BAR_HEIGHT,
                      ),
                      backgroundColor: theme.colors.tier.unsettled,
                    }}
                  />
                </View>

                <Text variant="label" style={{ marginTop: 4 }}>
                  {formatPercent(hour.precipitationProbabilityPct)}
                </Text>

                {/* CAPE: the instability bar a chaser is actually reading for. */}
                {hour.capeJkg !== null && capeMax > 0 ? (
                  <View
                    style={{
                      width: 26,
                      height: CAPE_BAR_HEIGHT,
                      marginTop: 8,
                      borderRadius: 4,
                      backgroundColor: theme.colors.surfaceSunken,
                      justifyContent: 'flex-end',
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: Math.max(2, normalise(hour.capeJkg, 0, capeMax) * CAPE_BAR_HEIGHT),
                        backgroundColor:
                          hour.capeJkg >= CAPE_SEVERE_JKG
                            ? theme.colors.tier.severe
                            : theme.colors.tier.active,
                      }}
                    />
                  </View>
                ) : (
                  <View style={{ height: 30 }} />
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 14,
          marginTop: 14,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <Key color={theme.colors.tierText.severe} label="Temperature" />
        <Key color={theme.colors.tier.unsettled} label="Rain chance" />
        <Key color={theme.colors.tier.active} label="CAPE J/kg" />
      </View>
    </Panel>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text variant="label">{label}</Text>
    </View>
  );
}
