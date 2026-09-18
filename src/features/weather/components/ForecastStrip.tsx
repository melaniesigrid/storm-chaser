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

export function ForecastStrip({ hours }: { hours: HourlyPoint[] }) {
  const { theme } = useAppTheme();

  if (!hours.length) return null;

  const temperatures = hours.map((hour) => hour.temperatureC);
  const capes = compact(hours.map((hour) => hour.capeJkg));
  const chartWidth = hours.length * COLUMN + (hours.length - 1) * GAP;

  // CAPE bars share one domain across the strip, so a tall bar means real
  // instability rather than just the tallest value in this particular window.
  const capeMax = capes.length ? Math.max(1000, Math.max(...capes)) : 0;

  return (
    <Panel label="Next 12 hours" style={{ marginBottom: 12 }}>
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
                  <WeatherIcon name={iconForCondition(hour.condition, !hour.isDay)} size={36} />
                </View>

                <Text variant="body" style={{ fontFamily: theme.type.monoMedium, fontSize: 16 }}>
                  {formatTemperature(hour.temperatureC)}
                </Text>

                {/* Rain chance as a filled column: scannable without reading it. */}
                <View
                  style={{
                    width: 26,
                    height: 34,
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
                        normalise(hour.precipitationProbabilityPct, 0, 100) * 34,
                      ),
                      backgroundColor: theme.colors.tier.unsettled,
                    }}
                  />
                </View>

                <Text
                  variant="caption"
                  style={{ marginTop: 4, fontFamily: theme.type.mono, fontSize: 12 }}
                >
                  {formatPercent(hour.precipitationProbabilityPct)}
                </Text>

                {/* CAPE: the instability bar a chaser is actually reading for. */}
                {hour.capeJkg !== null && capeMax > 0 ? (
                  <View
                    style={{
                      width: 26,
                      height: 22,
                      marginTop: 8,
                      borderRadius: 4,
                      backgroundColor: theme.colors.surfaceSunken,
                      justifyContent: 'flex-end',
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: Math.max(2, normalise(hour.capeJkg, 0, capeMax) * 22),
                        backgroundColor:
                          hour.capeJkg >= 1500
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
