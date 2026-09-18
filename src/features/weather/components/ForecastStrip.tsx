import { ScrollView, View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';
import { formatHourLabel, formatPercent, formatTemperature } from '@/core/utils/format';

import { iconForCondition } from '../model/weatherIcons';
import type { HourlyPoint } from '../model/types';

export function ForecastStrip({ hours }: { hours: HourlyPoint[] }) {
  const { theme } = useAppTheme();

  if (!hours.length) return null;

  return (
    <Panel label="Next 12 hours" style={{ marginBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 18, paddingRight: 8 }}>
          {hours.map((hour, index) => (
            <View key={hour.time} style={{ alignItems: 'center', minWidth: 52 }}>
              <Text variant="label">{index === 0 ? 'Now' : formatHourLabel(hour.time)}</Text>

              <View style={{ marginVertical: 8 }}>
                <WeatherIcon
                  name={iconForCondition(hour.condition, !hour.isDay)}
                  size={38}
                />
              </View>

              <Text
                variant="body"
                style={{ fontFamily: theme.type.monoMedium, fontSize: 16 }}
              >
                {formatTemperature(hour.temperatureC)}
              </Text>

              <Text
                variant="caption"
                color={theme.colors.tierText.unsettled}
                style={{ marginTop: 4, fontFamily: theme.type.mono, fontSize: 13 }}
              >
                {formatPercent(hour.precipitationProbabilityPct)}
              </Text>

              {hour.capeJkg !== null ? (
                <Text
                  variant="caption"
                  style={{ marginTop: 3, fontFamily: theme.type.mono, fontSize: 12 }}
                >
                  {Math.round(hour.capeJkg)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <Text variant="caption" style={{ marginTop: 12 }}>
        Rows: temperature, precipitation probability, CAPE (J/kg).
      </Text>
    </Panel>
  );
}
